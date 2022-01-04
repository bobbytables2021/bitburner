// This script walks the network using a bread first search
// and stores an array of Server objects with an additional
// parent member. The BFS is used to ensure that hosts are
// discovered by order of shortest distance from home.

/** @param {NS} ns **/
export async function main(ns) {
	var hosts = [];
	var queue = ["home"];
	var touched = {};
	touched["home"] = true;
	var home = ns.getServer("home");
	home.reserve = 8;
	hosts.push(home);
	while (queue.length > 0) {
		const host = queue.shift();
		const neighbors = ns.scan(host);
		for (const neighbor of neighbors) {
			if (!touched[neighbor]) {
				queue.push(neighbor);
				var server = ns.getServer(neighbor);
				server.parent = host;
				if (neighbor == "n00dles" || neighbor == "foodnstuff") {
					server.reserve = server.maxRam;
				} else {
					server.reserve = 0;
				}
				hosts.push(server);
				touched[neighbor] = true;
			}
		}
	}
	await ns.write("/tmp/hosts.txt", JSON.stringify(hosts), "w");
}
