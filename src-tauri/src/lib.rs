use serde::Serialize;
use std::{fs, path::{Path, PathBuf}};

const TARGETS: &[&str] = &["node_modules", "dist", "build", ".next", ".nuxt", "coverage", ".turbo"];

#[derive(Debug, Serialize)]
struct FoundFolder { path: String, name: String, project: String, size_bytes: u64 }

fn folder_size(path: &Path) -> u64 {
    let mut total = 0;
    let Ok(entries) = fs::read_dir(path) else { return 0 };
    for entry in entries.flatten() {
        let child = entry.path();
        if let Ok(metadata) = fs::symlink_metadata(&child) {
            if metadata.file_type().is_symlink() { continue; }
            if metadata.is_dir() { total += folder_size(&child); }
            else { total += metadata.len(); }
        }
    }
    total
}

fn scan(path: &Path, root: &Path, found: &mut Vec<FoundFolder>) -> Result<(), String> {
    let entries = fs::read_dir(path).map_err(|e| format!("Cannot read {}: {e}", path.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let child = entry.path();
        let metadata = fs::symlink_metadata(&child).map_err(|e| e.to_string())?;
        if metadata.file_type().is_symlink() || !metadata.is_dir() { continue; }
        let name = entry.file_name().to_string_lossy().to_string();
        if TARGETS.contains(&name.as_str()) {
            let project = child.parent().unwrap_or(root).strip_prefix(root).unwrap_or(Path::new(".")).display().to_string();
            found.push(FoundFolder { path: child.to_string_lossy().to_string(), name, project, size_bytes: folder_size(&child) });
        } else if name != ".git" {
            scan(&child, root, found)?;
        }
    }
    Ok(())
}

#[tauri::command]
fn scan_workspace(root: String) -> Result<Vec<FoundFolder>, String> {
    let root_path = PathBuf::from(root).canonicalize().map_err(|e| format!("Invalid workspace: {e}"))?;
    if !root_path.is_dir() { return Err("Workspace path is not a directory".into()); }
    let mut found = Vec::new();
    scan(&root_path, &root_path, &mut found)?;
    found.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(found)
}

#[tauri::command]
fn trash_folders(root: String, paths: Vec<String>) -> Result<(), String> {
    let root_path = PathBuf::from(root).canonicalize().map_err(|e| format!("Invalid workspace: {e}"))?;
    for raw_path in paths {
        let path = PathBuf::from(&raw_path);
        let canonical = path.canonicalize().map_err(|e| format!("Invalid folder {}: {e}", path.display()))?;
        if !canonical.starts_with(&root_path) || !canonical.is_dir() { return Err(format!("Refusing to trash unsafe path: {}", canonical.display())); }
        let name = canonical.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if !TARGETS.contains(&name) { return Err(format!("Refusing to trash unapproved folder: {name}")); }
        trash::delete(&canonical).map_err(|e| format!("Could not move {} to Trash: {e}", canonical.display()))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_workspace, trash_folders])
        .run(tauri::generate_context!())
        .expect("error while running Workspace Cleaner");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn new() -> Self {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let path = std::env::temp_dir().join(format!("workspace-cleaner-test-{unique}"));
            fs::create_dir(&path).unwrap();
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn create_dir(path: &Path) {
        fs::create_dir_all(path).unwrap();
    }

    fn scan_root(root: &Path) -> Vec<FoundFolder> {
        let mut found = Vec::new();
        scan(root, root, &mut found).unwrap();
        found
    }

    #[test]
    fn scan_finds_every_approved_folder_name() {
        let temp = TestDir::new();
        for target in TARGETS {
            create_dir(&temp.path().join(target));
        }

        let found = scan_root(temp.path());
        let mut names: Vec<_> = found.iter().map(|folder| folder.name.as_str()).collect();
        names.sort_unstable();
        let mut expected: Vec<_> = TARGETS.to_vec();
        expected.sort_unstable();

        assert_eq!(names, expected);
    }

    #[cfg(unix)]
    #[test]
    fn scan_ignores_symlinks_including_symlinks_to_target_folders() {
        use std::os::unix::fs::symlink;

        let temp = TestDir::new();
        let real_target = temp.path().join("real-node-modules");
        create_dir(&real_target);
        symlink(&real_target, temp.path().join("node_modules")).unwrap();

        let found = scan_root(temp.path());

        assert!(found.is_empty());
    }

    #[test]
    fn scan_skips_git_directories() {
        let temp = TestDir::new();
        create_dir(&temp.path().join(".git").join("node_modules"));
        create_dir(&temp.path().join("project").join("dist"));

        let found = scan_root(temp.path());

        assert_eq!(found.len(), 1);
        assert_eq!(found[0].name, "dist");
    }

    #[test]
    fn trash_rejects_paths_outside_workspace_including_parent_traversal() {
        let workspace = TestDir::new();
        let outside = TestDir::new();
        let outside_target = outside.path().join("node_modules");
        create_dir(&outside_target);

        let outside_result = trash_folders(
            workspace.path().to_string_lossy().into_owned(),
            vec![outside_target.to_string_lossy().into_owned()],
        );
        assert!(outside_result.is_err());

        let traversal_result = trash_folders(
            workspace.path().to_string_lossy().into_owned(),
            vec![workspace.path().join("..").join("node_modules").to_string_lossy().into_owned()],
        );
        assert!(traversal_result.is_err());
    }

    #[test]
    fn trash_rejects_unapproved_folder_names() {
        let workspace = TestDir::new();
        let unapproved = workspace.path().join("keep-me");
        create_dir(&unapproved);

        let result = trash_folders(
            workspace.path().to_string_lossy().into_owned(),
            vec![unapproved.to_string_lossy().into_owned()],
        );

        let error = result.unwrap_err();
        assert!(error.contains("unapproved folder"));
    }

    #[test]
    fn folder_size_counts_nested_files() {
        let temp = TestDir::new();
        let nested = temp.path().join("nested").join("deeper");
        create_dir(&nested);
        fs::write(temp.path().join("root.txt"), vec![0u8; 7]).unwrap();
        fs::write(nested.join("child.txt"), vec![0u8; 13]).unwrap();

        assert_eq!(folder_size(temp.path()), 20);
    }
}
