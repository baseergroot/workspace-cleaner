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
