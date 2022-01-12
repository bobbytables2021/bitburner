class WHRNG {
	constructor(time) {
		const v = (time / 1000) % 30000;
		this.s1 = v;
		this.s2 = v;
		this.s3 = v;
		this.stillIn = true;
	}

	step() {
		this.s1 = (171 * this.s1) % 30269;
		this.s2 = (172 * this.s2) % 30307;
		this.s3 = (170 * this.s3) % 30323;
	}

	random() {
		this.step();
		return (this.s1 / 30269.0 + this.s2 / 30307.0 + this.s3 / 30323.0) % 1.0;
	}

	next() {
		return Math.floor(this.random() * 37);
	}

	observe(n, trusted) {
		const next = this.next();
		if (trusted && next !== n) {
			this.stillIn = false;
		}
	}
}

/** @param {NS} ns **/
export async function main(ns) {
	let inCasino = false;
	let candidates;
	let waiting = false;
	let played = false;
	let filtering = false;
	try {
		while (true) {
			await ns.sleep(1000);
			const pane = eval("document").getElementById("root").children[0].children[1].children[1];
			const title = pane.children[1];
			if (!inCasino) {
				if (title.innerHTML === "Iker Molina Casino") {
					ns.toast("In Casino!");
					inCasino = true;
					candidates = createCandidates(Date.now());
				} else {
					continue;
				}
			}
			if (!waiting) {
				const status = pane.children[5];
				if (status.innerHTML === "waiting") {
					ns.toast("Waiting! Play Red!");
					waiting = true;
					filtering = true;
				}
			}
			const status = pane.children[5];
			if (status.innerHTML === "playing") {
				ns.toast("Playing!");
				played = true;
			}
			if (played) {
				const result = pane.children[3].innerHTML;
				const status = pane.children[5].innerHTML;
				if (status.startsWith("lost") || status.startsWith("won")) {
					if (filtering) {
						const trusted = status.startsWith("won");
						const n = parseInt(result);
						//ns.toast(`Checking for ${n} with trusted=${trusted}`);
						candidates.forEach((c) => c.observe(n, trusted));
						candidates = candidates.filter((c) => c.stillIn);
						ns.toast(`${candidates.length} candidates left!`);
						if (candidates.length === 1) {
							filtering = false;
							// Skip one for some reason
							candidates[0].next();
							const next = candidates[0].next();
							ns.toast(`Pick ${next}!`);
						}
					} else {
						const next = candidates[0].next();
						ns.toast(`Pick ${next}!`);
					}
					played = false;
				}
			}
		}
	} catch (e) {
		ns.toast("Left Casino!");
	}
}

function createCandidates(ms) {
	const begin = ms - 5000;
	const end = ms + 5000;
	let candidates = [];
	for (let i = begin; i < end; i++) {
		candidates.push(new WHRNG(i));
	}
	return candidates;
}
