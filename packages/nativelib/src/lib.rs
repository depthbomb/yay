#![deny(clippy::all)]

use napi_derive::napi;
use std::collections::HashMap;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::Foundation::HANDLE;
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW, TH32CS_SNAPPROCESS,
};

#[derive(Debug)]
struct ProcessNode {
    pid: u32,
    name: String,
    children: Vec<ProcessNode>,
}

struct ProcessEntry {
    pid: u32,
    parent_pid: u32,
    name: String,
}

fn snapshot_processes() -> Option<Vec<ProcessEntry>> {
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0).ok()?;
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };

        let mut processes = Vec::new();
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                processes.push(ProcessEntry {
                    pid: entry.th32ProcessID,
                    parent_pid: entry.th32ParentProcessID,
                    name: widestring_to_string(&entry.szExeFile),
                });

                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }

        let _ = CloseHandle(HANDLE(snapshot.0));

        Some(processes)
    }
}

fn build_process_tree(
    pid: u32,
    name: String,
    children_by_parent: &mut HashMap<u32, Vec<ProcessEntry>>,
) -> ProcessNode {
    let children = children_by_parent
        .remove(&pid)
        .unwrap_or_default()
        .into_iter()
        .filter(|child| child.pid != pid)
        .map(|child| build_process_tree(child.pid, child.name, children_by_parent))
        .collect();

    ProcessNode {
        pid,
        name,
        children,
    }
}

fn widestring_to_string(buf: &[u16]) -> String {
    let nul_pos = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    OsString::from_wide(&buf[..nul_pos])
        .to_string_lossy()
        .into_owned()
}

#[napi(object)]
pub struct JSProcessNode {
    pub pid: u32,
    pub name: String,
    pub children: Vec<JSProcessNode>,
}

impl From<ProcessNode> for JSProcessNode {
    fn from(node: ProcessNode) -> Self {
        Self {
            pid: node.pid,
            name: node.name,
            children: node.children.into_iter().map(Into::into).collect(),
        }
    }
}

#[napi]
pub async fn get_process_tree(pid: u32) -> Option<JSProcessNode> {
    let processes = snapshot_processes()?;
    let root_name = processes
        .iter()
        .find(|process| process.pid == pid)?
        .name
        .clone();
    let mut children_by_parent: HashMap<u32, Vec<ProcessEntry>> = HashMap::new();
    for process in processes {
        children_by_parent
            .entry(process.parent_pid)
            .or_default()
            .push(process);
    }

    let root = build_process_tree(pid, root_name, &mut children_by_parent);

    Some(root.into())
}
