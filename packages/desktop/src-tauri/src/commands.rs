use crate::state::{AppConfig, AppState, PtySession, SharedState};
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::{mpsc, Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct TaskSummary {
    #[serde(rename = "taskId")]
    pub task_id: String,
    pub prompt: String,
    pub phase: String,
    pub cost: f64,
    #[serde(rename = "startedAt")]
    pub started_at: String,
}

fn db_path(state_dir: &str) -> PathBuf {
    PathBuf::from(state_dir).join("agentos.db")
}

#[tauri::command]
pub fn list_tasks(state: State<'_, SharedState>) -> Result<Vec<TaskSummary>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    let path = db_path(&state.config.state_dir);

    if !path.exists() {
        return Ok(Vec::new());
    }

    let conn = Connection::open(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT task_id, created_at FROM checkpoints ORDER BY created_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1).unwrap_or_default(),
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for row in rows {
        let (task_id, created_at) = row.map_err(|e| e.to_string())?;

        // Get last checkpoint for this task
        let phase_and_cost: Result<(String, f64), _> = conn.query_row(
            "SELECT phase, state_json FROM checkpoints WHERE task_id = ? ORDER BY created_at DESC LIMIT 1",
            [&task_id],
            |row| {
                let phase: String = row.get(0)?;
                let state_json: String = row.get(1)?;
                let cost = serde_json::from_str::<serde_json::Value>(&state_json)
                    .ok()
                    .and_then(|v| v["cost"].as_f64())
                    .unwrap_or(0.0);
                Ok((phase, cost))
            },
        );

        let (phase, cost) = phase_and_cost.unwrap_or_else(|_| ("unknown".into(), 0.0));
        tasks.push(TaskSummary {
            task_id,
            prompt: String::new(),
            phase,
            cost,
            started_at: created_at,
        });
    }

    Ok(tasks)
}

#[tauri::command]
pub fn get_config(state: State<'_, SharedState>) -> Result<AppConfig, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(state.config.clone())
}

#[tauri::command]
pub fn save_config(config: AppConfig, state: State<'_, SharedState>) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.config = config;
    state.save_config().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn spawn_terminal(
    cols: u16,
    rows: u16,
    app: AppHandle,
    state: State<'_, SharedState>,
) -> Result<String, String> {
    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    // Reader thread: forward pty output → frontend event
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let id_r = id.clone();
    let app_r = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app_r.emit(
                        &format!("pty:{}:data", id_r),
                        serde_json::json!({ "data": data }),
                    );
                }
            }
        }
    });

    // Writer thread: drain channel → pty master
    let (tx, rx) = mpsc::channel::<Vec<u8>>();
    let mut writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    std::thread::spawn(move || {
        while let Ok(bytes) = rx.recv() {
            if writer.write_all(&bytes).is_err() {
                break;
            }
        }
    });

    let master = Arc::new(Mutex::new(pair.master));
    let child = Arc::new(Mutex::new(child));
    let session = PtySession { master, tx, child };

    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.ptys.insert(id.clone(), session);

    Ok(id)
}

#[tauri::command]
pub fn write_pty(id: String, data: String, state: State<'_, SharedState>) -> Result<(), String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    let session = state.ptys.get(&id).ok_or("pty not found")?;
    session
        .tx
        .send(data.into_bytes())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resize_pty(
    id: String,
    cols: u16,
    rows: u16,
    state: State<'_, SharedState>,
) -> Result<(), String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    let session = state.ptys.get(&id).ok_or("pty not found")?;
    let master = session.master.lock().map_err(|e| e.to_string())?;
    master
        .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kill_pty(id: String, state: State<'_, SharedState>) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    if let Some(session) = state.ptys.remove(&id) {
        if let Ok(mut child) = session.child.lock() {
            let _ = child.kill();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn start_task(_prompt: String) -> Result<String, String> {
    // Task execution is handled by spawning the CLI via the terminal.
    // This command is a placeholder for future sidecar integration.
    Err("Use the terminal pane to run: agentos run \"<prompt>\"".into())
}

#[tauri::command]
pub fn approve_task(_task_id: String) -> Result<(), String> {
    Err("Approval via desktop UI requires the task runner sidecar (v2.1)".into())
}

#[tauri::command]
pub fn reject_task(_task_id: String, _reason: String) -> Result<(), String> {
    Err("Rejection via desktop UI requires the task runner sidecar (v2.1)".into())
}
