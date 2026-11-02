#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use midir::{Ignore, MidiInput, MidiInputConnection};
use serde::Serialize;
use std::sync::Mutex;
use tauri::{Emitter, State};

struct MidiState(Mutex<Option<MidiInputConnection<()>>>);
#[derive(Serialize)]
struct Port { id: String, name: String }
#[derive(Clone, Serialize)]
struct MidiPacket { data: Vec<u8> }

#[tauri::command]
fn midi_ports() -> Result<Vec<Port>, String> {
    let input = MidiInput::new("Banpai discovery").map_err(|e| e.to_string())?;
    Ok(input.ports().iter().map(|p| Port { id: p.id(), name: input.port_name(p).unwrap_or_else(|_| "MIDI keyboard".into()) }).collect())
}
#[tauri::command]
fn midi_connect(id: String, app: tauri::AppHandle, state: State<MidiState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = None;
    let mut input = MidiInput::new("Banpai input").map_err(|e| e.to_string())?;
    input.ignore(Ignore::None);
    let port = input.find_port_by_id(&id).ok_or("设备已断开，请刷新设备列表")?;
    let connection = input.connect(&port, "Banpai piano", move |_, bytes, _| {
        if bytes.len() >= 3 { let _ = app.emit("midi-message", MidiPacket { data: bytes.to_vec() }); }
    }, ()).map_err(|e| e.to_string())?;
    *guard = Some(connection);
    Ok(())
}
#[tauri::command]
fn midi_disconnect(state: State<MidiState>) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}
fn main() {
    tauri::Builder::default().manage(MidiState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![midi_ports, midi_connect, midi_disconnect])
        .run(tauri::generate_context!()).expect("Unable to run Banpai Piano Studio");
}
