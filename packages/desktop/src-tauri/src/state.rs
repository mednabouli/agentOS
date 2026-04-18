use portable_pty::MasterPty;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{mpsc, Arc, Mutex};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct AppConfig {
    pub anthropic_key: String,
    pub log_level: String,
    pub auto_approve: bool,
    pub state_dir: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        let state_dir = dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".agentOS")
            .join("state")
            .to_string_lossy()
            .into_owned();
        Self {
            anthropic_key: String::new(),
            log_level: "info".into(),
            auto_approve: false,
            state_dir,
        }
    }
}

pub struct PtySession {
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub tx: mpsc::Sender<Vec<u8>>,
    pub child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
}

pub struct AppState {
    pub config: AppConfig,
    pub ptys: HashMap<String, PtySession>,
    pub config_path: PathBuf,
}

impl AppState {
    pub fn load() -> Self {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("AgentOS");
        let config_path = config_dir.join("config.json");

        let config = if config_path.exists() {
            std::fs::read_to_string(&config_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            AppConfig::default()
        };

        Self {
            config,
            ptys: HashMap::new(),
            config_path,
        }
    }

    pub fn save_config(&self) -> std::io::Result<()> {
        if let Some(parent) = self.config_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(&self.config)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        std::fs::write(&self.config_path, json)
    }
}

pub type SharedState = Mutex<AppState>;
