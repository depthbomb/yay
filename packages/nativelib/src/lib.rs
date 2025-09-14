#![deny(clippy::all)]

use napi_derive::napi;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use windows::Win32::Foundation::HANDLE;
use windows::Win32::System::Diagnostics::ToolHelp::{
	CreateToolhelp32Snapshot, Process32FirstW, Process32NextW,
	PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::Foundation::CloseHandle;

#[derive(Debug)]
struct ProcessNode {
	pid: u32,
	name: String,
	children: Vec<ProcessNode>,
}

impl ProcessNode {
	fn new(pid: u32, name: String) -> Self {
		Self { pid, name, children: vec![] }
	}
}

fn get_process_name(pid: u32) -> Option<String> {
	unsafe {
		let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0).ok()?;
		let mut entry = PROCESSENTRY32W {
			dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
			..Default::default()
		};

		let mut name = None;
		if Process32FirstW(snapshot, &mut entry).is_ok() {
			loop {
				if entry.th32ProcessID == pid {
					name = Some(widestring_to_string(&entry.szExeFile));
					break;
				}
				if Process32NextW(snapshot, &mut entry).is_err() {
					break;
				}
			}
		}

		let _ = CloseHandle(HANDLE(snapshot.0));

		name
	}
}

fn build_process_tree(node: &mut ProcessNode) {
	unsafe {
		let snapshot = match CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) {
			Ok(s) => s,
			Err(_) => return,
		};

		let mut entry = PROCESSENTRY32W {
			dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
			..Default::default()
		};

		if Process32FirstW(snapshot, &mut entry).is_ok() {
			loop {
				if entry.th32ParentProcessID == node.pid && entry.th32ProcessID != node.pid {
					let name = widestring_to_string(&entry.szExeFile);
					let mut child = ProcessNode::new(entry.th32ProcessID, name);
					build_process_tree(&mut child);
					node.children.push(child);
				}

				if Process32NextW(snapshot, &mut entry).is_err() {
					break;
				}
			}
		}

		let _ = CloseHandle(HANDLE(snapshot.0));
	}
}

fn widestring_to_string(buf: &[u16]) -> String {
	let nul_pos = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
	OsString::from_wide(&buf[..nul_pos]).to_string_lossy().into_owned()
}

#[napi(object)]
pub struct JsProcessNode {
	pub pid: u32,
	pub name: String,
	pub children: Vec<JsProcessNode>,
}

impl From<ProcessNode> for JsProcessNode {
	fn from(node: ProcessNode) -> Self {
		Self {
			pid: node.pid,
			name: node.name,
			children: node.children.into_iter().map(Into::into).collect(),
		}
	}
}

#[napi]
pub async fn get_process_tree(pid: u32) -> Option<JsProcessNode> {
	let root_name = get_process_name(pid)?;
	let mut root = ProcessNode::new(pid, root_name);

	build_process_tree(&mut root);

	Some(root.into())
}
