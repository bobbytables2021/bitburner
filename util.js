// This is a collection of generally useful 
// 0GB functions. I imagine it will mostly be
// IPC reads and writes.

/** @param {NS} ns **/
export function GetHosts(ns) {
	return JSON.parse(ns.read("/tmp/hosts.txt"));
}

/** @param {NS} ns **/
export function FindHost(hosts, name) {
	for (var i = 0; i < hosts.length; i++) {
		if (hosts[i].hostname == name) {
			return hosts[i];
		}
	}
	return null;
}

/** @param {NS} ns **/
export function GetPath(ns, destination) {
	const hosts = GetHosts(ns);
	var current = FindHost(hosts, destination);
	if (current == null) {
		return [];
	}
	var path = [current.hostname];
	while (current.parent != "home") {
		current = FindHost(hosts, current.parent);
		path.push(current.hostname);
	}
	path.reverse();
	return path;
}

/** @param {NS} ns **/
export function GetReserveCash(ns) {
	const content = ns.read("/tmp/reserve-money.txt");
	if (content == "") {
		return 0;
	}
	return JSON.parse(content);
}
