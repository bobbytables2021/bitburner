// This file sees if we can purchase another server for
// hacking or upgrade the set together.

import { CONSTANT } from "./constants.js";
import { GetHosts, GetReserveCash } from "./util.js";

/** @param {NS} ns **/
export async function main(ns) {
	const limit = ns.getPurchasedServerLimit();
	const hosts = GetHosts(ns);
	const purchased = hosts.filter(function (host) {
		if (host.hostname == "NaN") {
			return true;
		}
		return host.hostname.startsWith(CONSTANT.purchasedPrefix);
	});
	var ram = purchased.length == limit ? 2 * purchased[0].maxRam : 32;
	const reserve = GetReserveCash(ns);
	const cash = ns.getServerMoneyAvailable("home") - reserve;
	const cost = ns.getPurchasedServerCost(ram);
	if (purchased.length < limit) {
		if (cash > cost) {
			const name = CONSTANT.purchasedPrefix + purchased.length;
			ns.purchaseServer(name, ram);
			await ns.scp(CONSTANT.workerScripts, "home", name);
		}
	} else {
		if (cash > limit * cost) {
			for (const server of purchased) {
				ns.deleteServer(server.hostname);
				ns.purchaseServer(server.hostname, ram);
				await ns.scp(CONSTANT.workerScripts, "home", server.hostname);
			}
		}
	}
}
