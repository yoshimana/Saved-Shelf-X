const requestedLanguage = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
const language = requestedLanguage.startsWith('zh') ? 'zh-CN' : requestedLanguage.startsWith('ja') ? 'ja' : 'en';
const messages = {
    ja: {
        unknown: 'Safariの機能拡張設定で X Bookmark Shelf をオンにできます。',
        on: 'X Bookmark Shelf はオンです。Safariの機能拡張設定からオフにできます。',
        off: 'X Bookmark Shelf はオフです。Safariの機能拡張設定からオンにできます。',
        preferences: '終了してSafariの機能拡張設定を開く…',
        settingsUnknown: 'Safariの設定にある「機能拡張」から X Bookmark Shelf をオンにできます。',
        settingsOn: 'X Bookmark Shelf はオンです。Safariの設定にある「機能拡張」からオフにできます。',
        settingsOff: 'X Bookmark Shelf はオフです。Safariの設定にある「機能拡張」からオンにできます。',
        settingsButton: '終了してSafariの設定を開く…'
    },
    en: {
        unknown: 'You can turn on X Bookmark Shelf in Safari Extensions preferences.',
        on: 'X Bookmark Shelf is on. You can turn it off in Safari Extensions preferences.',
        off: 'X Bookmark Shelf is off. You can turn it on in Safari Extensions preferences.',
        preferences: 'Quit and Open Safari Extensions Preferences…',
        settingsUnknown: 'You can turn on X Bookmark Shelf in the Extensions section of Safari Settings.',
        settingsOn: 'X Bookmark Shelf is on. You can turn it off in the Extensions section of Safari Settings.',
        settingsOff: 'X Bookmark Shelf is off. You can turn it on in the Extensions section of Safari Settings.',
        settingsButton: 'Quit and Open Safari Settings…'
    },
    'zh-CN': {
        unknown: '你可以在 Safari 的“扩展”设置中启用 X Bookmark Shelf。',
        on: 'X Bookmark Shelf 已启用。你可以在 Safari 的“扩展”设置中将其关闭。',
        off: 'X Bookmark Shelf 已关闭。你可以在 Safari 的“扩展”设置中将其启用。',
        preferences: '退出并打开 Safari“扩展”设置…',
        settingsUnknown: '你可以在 Safari 设置的“扩展”中启用 X Bookmark Shelf。',
        settingsOn: 'X Bookmark Shelf 已启用。你可以在 Safari 设置的“扩展”中将其关闭。',
        settingsOff: 'X Bookmark Shelf 已关闭。你可以在 Safari 设置的“扩展”中将其启用。',
        settingsButton: '退出并打开 Safari 设置…'
    }
};

function show(enabled, useSettingsInsteadOfPreferences) {
    const copy = messages[language];
    const suffix = useSettingsInsteadOfPreferences ? 'Settings' : '';
    document.querySelector('.state-unknown').textContent = copy['unknown' + suffix] || copy.unknown;
    document.querySelector('.state-on').textContent = copy['on' + suffix] || copy.on;
    document.querySelector('.state-off').textContent = copy['off' + suffix] || copy.off;
    document.querySelector('.open-preferences').textContent = copy[useSettingsInsteadOfPreferences ? 'settingsButton' : 'preferences'];

    if (typeof enabled === 'boolean') {
        document.body.classList.toggle('state-on', enabled);
        document.body.classList.toggle('state-off', !enabled);
    } else {
        document.body.classList.remove('state-on');
        document.body.classList.remove('state-off');
    }
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage('open-preferences');
}

document.querySelector('button.open-preferences').addEventListener('click', openPreferences);
show(undefined, false);
