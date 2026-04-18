mod commands;
mod state;

use state::{AppState, SharedState};
use std::sync::Mutex;

pub fn run() {
    let app_state: SharedState = Mutex::new(AppState::load());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::list_tasks,
            commands::get_config,
            commands::save_config,
            commands::spawn_terminal,
            commands::write_pty,
            commands::resize_pty,
            commands::kill_pty,
            commands::start_task,
            commands::approve_task,
            commands::reject_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AgentOS desktop");
}
