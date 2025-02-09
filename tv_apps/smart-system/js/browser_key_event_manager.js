'use strict';
(function(exports) {
  var BrowserKeyEventManager = function BrowserKeyEventManager() {
  };

  BrowserKeyEventManager.prototype = {
    KEY_EVENTS: Object.freeze([
      'mozbrowserbeforekeydown',
      'mozbrowserbeforekeyup',
      'mozbrowserafterkeydown',
      'mozbrowserafterkeyup',
      'keydown',
      'keyup'
    ]),
    SYSTEM_ONLY_KEYS: Object.freeze([
      'power',
      'home',
      'exit'
    ]),
    APP_CANCELLED_KEYS: Object.freeze([
      'volumeup',
      'volumedown'
    ]),
    TRANSLATION_TABLE: Object.freeze({
      'power': 'sleep-button',
      'exit': 'home-button',
      'home': 'home-button',
      'volumeup': 'volume-up-button',
      'volumedown': 'volume-down-button'
    }),
    _getLowerCaseKeyName: function bkem_getLowerCaseKeyName(event) {
      return event.key && event.key.toLowerCase();
    },
    _isSystemOnlyKey: function bkem_isSystemOnlyKey(event) {
      var key = this._getLowerCaseKeyName(event);
      return (this.SYSTEM_ONLY_KEYS.indexOf(key) > -1);
    },
    _isAppCancelledKey: function bkem_isAppCancelledKey(event) {
      var key = this._getLowerCaseKeyName(event);
      return (this.APP_CANCELLED_KEYS.indexOf(key) > -1);
    },
    _isBeforeEvent: function bkem_isBeforeEvent(event) {
      return event.type === 'mozbrowserbeforekeyup' ||
        event.type === 'mozbrowserbeforekeydown';
    },
    _isAfterEvent: function bkem_isAfterEvent(event) {
      return event.type === 'mozbrowserafterkeyup' ||
        event.type === 'mozbrowserafterkeydown';
    },
    _isKeyEvent: function bkem_isKeyEvent(event) {
      return event.type === 'keyup' ||
        event.type === 'keydown';
    },
    _applyPolicy: function bkem_applyPolicy(event) {
      // all other unknown keys are default to APP-ONLY
      // so we assume there is no translation needed by default
      var needTranslation = false;
      if (this._isSystemOnlyKey(event) &&
          (this._isBeforeEvent(event) || this._isKeyEvent(event))) {
        event.preventDefault();
        needTranslation = true;
      } else if (this._isAppCancelledKey(event) && this._isAfterEvent(event)) {
        // if embedded frame cancel the event, we need to translate it then
        needTranslation = !event.embeddedCancelled;
      } else if (this._isKeyEvent(event)){
        needTranslation = true;
      }
      return needTranslation;
    },
    isHomeKey: function bkem_isHomeKey(event) {
      var key = this._getLowerCaseKeyName(event);
      return key === 'exit' || key === 'home';
    },
    isHardwareKeyEvent: function bkem_isHardwareKeyEvent(type) {
      return (this.KEY_EVENTS.indexOf(type) > -1);
    },
    getButtonEventType: function bkem_getButtonEventType(event) {
      var translatedType;
      var key;
      var suffix;
      var needTranslation =
        this.isHardwareKeyEvent(event.type) ? this._applyPolicy(event) : false;

      if (needTranslation) {
        key = this._getLowerCaseKeyName(event);
        suffix = (event.type.indexOf('keyup') > -1) ? '-release' : '-press';
        translatedType =
          this.TRANSLATION_TABLE[key] && this.TRANSLATION_TABLE[key] + suffix;
      }
      return translatedType;
    }
  };

  exports.BrowserKeyEventManager = BrowserKeyEventManager;
}(window));
