var _availableLocalStorage = null;
var _availableSessionStorage = null;

/******************************************************************************************/

function isLocalStorageAvailable() {
    if (_availableLocalStorage == null) {
        try {
            var storage = window['localStorage'],
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            _availableLocalStorage = true;
        }
        catch (e) {
            _availableLocalStorage = e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                storage && storage.length !== 0;
        }
    }
    return _availableLocalStorage;
}

function setLocalStorage(key, value) {
    if (isLocalStorageAvailable()) {
        window.localStorage.setItem(key, value);
        return true;
    }
    return false;
}

function getLocalStorage(key, valueDefault) {
    if (isLocalStorageAvailable()) {
        var val = window.localStorage.getItem(key);
        if (val)
            return val;
    }
    return valueDefault;
}

function removeLocalStorage(key) {
    if (isLocalStorageAvailable())
        window.localStorage.removeItem(key);
}

/******************************************************************************************/

function isSessionStorageAvailable() {
    if (_availableSessionStorage == null) {
        try {
            var storage = window['localStorage'],
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            _availableSessionStorage = true;
        }
        catch (e) {
            _availableSessionStorage = e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                storage && storage.length !== 0;
        }
    }
    return _availableSessionStorage;
}

function setSessionStorage(key, value) {
    if (isSessionStorageAvailable()) {
        window.sessionStorage.setItem(key, value);
        return true;
    }
    return false;
}

function getSessionStorage(key, valueDefault) {
    if (isSessionStorageAvailable()) {
        var val = window.sessionStorage.getItem(key);
        if (val)
            return val;
    }
    return valueDefault;
}

function removeSessionStorage(key) {
    if (isSessionStorageAvailable())
        window.sessionStorage.removeItem(key);
}


