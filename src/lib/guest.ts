const GUEST_KEY = 'gequ_guest_mode';

/** Guest mode never touches OWNER_KEY (see lib/cloud.ts), so if the same
 * browser later signs in for real, CloudSync treats it as a fresh device
 * and pulls/clears as usual — guest scratch data never leaks into an account. */
export function isGuestMode(): boolean {
    return localStorage.getItem(GUEST_KEY) === '1';
}

export function enterGuestMode() {
    localStorage.setItem(GUEST_KEY, '1');
}

export function exitGuestMode() {
    localStorage.removeItem(GUEST_KEY);
}
