// This is a collection of generally useful 
// 0GB functions. I imagine it will mostly be
// IPC reads and writes.

/** @param {NS} ns **/
export function GetHosts(ns) {
	return JSON.parse(ns.read("/tmp/hosts.txt"));
}
