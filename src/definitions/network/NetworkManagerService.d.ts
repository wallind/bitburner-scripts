/**
 * TODO:
 */
export interface Worker {
	id: string // UUID of the worker
	hostname: string // hostname the worker is running on
	target: string // hostname of the target server
	action: Action // action the worker is performing
	threads: number // number of threads the worker is using
	cores: number // number of cores the worker is using
}

/**
 * TODO:
 */
export interface WorkItem {

}


/**
 * TODO:
 */
export const enum Action {
	HACK,
	WEAKEN,
	GROW
}

/**
 * TODO:
 */
export interface CurrentNetworkProjection {
	projections: {
		hostname: string, // the hostname this projection is for
		security: {
			level: number, // the security level of the server after weakeners finish
			differential: number, // the security differential this server will have after hackers and growers finish
		},
		wealthProportion: number, // the proportion of wealth this server will have after assigned growers finish
	}[]
}

/**
 * TODO:
 */
export interface HostnameDetail {
	hostname: string
	fullPath: string
}
