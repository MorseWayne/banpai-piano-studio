#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use midir::{Ignore, MidiInput, MidiInputConnection};
use serde::Serialize;
use std::sync::{Mutex, OnceLock};
use std::time::Instant;
use tauri::{Emitter, State};

struct MidiState(Mutex<Option<MidiInputConnection<()>>>);
#[derive(Serialize)]
struct Port { id: String, name: String }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MidiPacket<'a> {
    data: &'a [u8],
    timestamp_us: u64,
    callback_us: u64,
    session: &'a str,
}

#[tauri::command]
fn midi_clock_us() -> u64 {
    static ORIGIN: OnceLock<Instant> = OnceLock::new();
    ORIGIN.get_or_init(Instant::now).elapsed().as_micros() as u64
}

#[tauri::command]
fn midi_ports() -> Result<Vec<Port>, String> {
    let input = MidiInput::new("Banpai discovery").map_err(|e| e.to_string())?;
    Ok(input.ports().iter().map(|p| Port { id: p.id(), name: input.port_name(p).unwrap_or_else(|_| "MIDI keyboard".into()) }).collect())
}
#[tauri::command]
fn midi_connect(id: String, session: String, app: tauri::AppHandle, state: State<MidiState>) -> Result<Option<u64>, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = None;
    let mut input = MidiInput::new("Banpai input").map_err(|e| e.to_string())?;
    input.ignore(Ignore::None);
    let port = input.find_port_by_id(&id).ok_or("设备已断开，请刷新设备列表")?;
    let connection = input.connect(&port, "Banpai piano", move |timestamp_us, bytes, _| {
        if bytes.len() >= 3 {
            let packet = MidiPacket { data: bytes, timestamp_us, callback_us: midi_clock_us(), session: &session };
            let _ = app.emit("midi-message", packet);
        }
    }, ()).map_err(|e| e.to_string())?;
    // The default Windows backend (WinMM) timestamps from midiInStart, just
    // before connect returns. Other midir backends have unspecified origins.
    let started_by_us = cfg!(windows).then(midi_clock_us);
    *guard = Some(connection);
    Ok(started_by_us)
}
#[tauri::command]
fn midi_disconnect(state: State<MidiState>) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}
fn main() {
    tauri::Builder::default().manage(MidiState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![midi_ports, midi_connect, midi_disconnect, midi_clock_us])
        .run(tauri::generate_context!()).expect("Unable to run Banpai Piano Studio");
}
