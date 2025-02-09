/* globals LazyL10n, LazyLoader, MobileOperator, Notification,
           NotificationHelper, Promise */

/* exported MmiManager */

'use strict';

// As defined in 3GPP TS 22.030 version 10.0.0 Release 10 standard
// USSD code used to query call barring supplementary service status
const CALL_BARRING_STATUS_MMI_CODE = '*#33#';
// USSD code used to query call waiting supplementary service status
const CALL_WAITING_STATUS_MMI_CODE = '*#43#';

var MmiManager = {

  COMMS_APP_ORIGIN: document.location.protocol + '//' +
                    document.location.host,
  _: null,
  _conn: null,
  _ready: false,
  // In some cases, the RIL doesn't provide the expected order of events
  // while sending an MMI that triggers an interactive USSD request (specially
  // while roaming), which should be DOMRequest.onsuccess (or .onerror) +
  // ussdreceived. If the first event received is the ussdreceived one, we take
  // the DOMRequest.onsuccess received subsequenty as a closure of the USSD
  // session.
  _pendingRequest: null,

  init: function mm_init(callback) {
    if (this._ready) {
      if (callback && callback instanceof Function) {
        callback();
      }
      return;
    }

    var self = this;
    var lazyFiles = ['/shared/js/icc_helper.js',
                     '/shared/style/input_areas.css',
                     '/shared/js/mobile_operator.js'];
    LazyLoader.load(lazyFiles, function resourcesLoaded() {
      window.addEventListener('message', self);
      for (var i = 0; i < navigator.mozMobileConnections.length; i++) {
        var conn = navigator.mozMobileConnections[i];

        // We cancel any active sessions if one exists to avoid sending any new
        // USSD message within an invalid session.
        conn.cancelMMI();
      }

      LazyL10n.get(function localized(_) {
        self._ = _;
        self._ready = true;
        callback();
      });
    });
  },

  send: function mm_send(message, cardIndex) {
    var conn = navigator.mozMobileConnections[cardIndex || 0];
    if (this._conn && (this._conn != conn)) {
      console.error('Starting a new MMI session before the previous has ' +
                    'finished is not permitted');
      return;
    }

    this._conn = conn;

    this.init((function onInitDone() {
      if (this._conn) {
        var request = this._pendingRequest = this._conn.sendMMI(message);
        request.onsuccess = (function mm_onsuccess(evt) {
          // TODO we are creating this callback instead of just doing:
          // request.onsuccess = this.notifySuccess.bind(this)
          // because we need to pass the original mmi code sent
          // This should be removed when bug 889737 and bug 1049651 are landed
          // as it should be possible to get it in the callback
          this.notifySuccess(evt, message);
        }).bind(this);
        request.onerror = this.notifyError.bind(this);
        this.openUI();
      }
    }).bind(this));
  },

  // Passing the sent MMI code because the message displayed to the user
  // could be different depending on the MMI code.
  notifySuccess: function mm_notifySuccess(evt, sentMMI) {
    // Helper function to compose an informative message about a successful
    // request to query the call forwarding status.
    var processCf = (function processCf(result) {
      var voice, data, fax, sms, sync, async, packet, pad;

      for (var i = 0; i < result.length; i++) {
        if (!result[i].active) {
          continue;
        }

        for (var serviceClassMask = 1;
             serviceClassMask <= this._conn.ICC_SERVICE_CLASS_MAX;
             serviceClassMask <<= 1) {
          if ((serviceClassMask & result[i].serviceClass) !== 0) {
            switch (serviceClassMask) {
              case this._conn.ICC_SERVICE_CLASS_VOICE:
                voice = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_DATA:
                data = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_FAX:
                fax = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_SMS:
                sms = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_DATA_SYNC:
                sync = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_DATA_ASYNC:
                async = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_PACKET:
                packet = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_PAD:
                pad = result[i].number;
                break;
              default:
                return this._('call-forwarding-error');
            }
          }
        }
      }

      var inactive = this._('call-forwarding-inactive');
      var msg = [
        this._('call-forwarding-status'),
        this._('call-forwarding-voice', { voice: voice || inactive }),
        this._('call-forwarding-data', { data: data || inactive }),
        this._('call-forwarding-fax', { fax: fax || inactive }),
        this._('call-forwarding-sms', { sms: sms || inactive }),
        this._('call-forwarding-sync', { sync: sync || inactive }),
        this._('call-forwarding-async', { async: async || inactive }),
        this._('call-forwarding-packet', { packet: packet || inactive }),
        this._('call-forwarding-pad', { pad: pad || inactive })
      ].join('\n');

      return msg;
    }).bind(this);

    var mmiResult = evt.target.result;

    var ci = this.cardIndexForConnection(this._conn);
    var message = {};

    // We always expect an MMIResult object even for USSD requests.
    if (!mmiResult) {
      message = {
        type: 'mmi-error',
        error: this._('GenericFailure')
      };

      window.postMessage(message, this.COMMS_APP_ORIGIN);
      return;
    }

    message.type = 'mmi-success';

    if (mmiResult.serviceCode) {
      message.title = this.prependSimNumber(this._(mmiResult.serviceCode), ci);
    }

    var additionalInformation = mmiResult.additionalInformation;

    switch (mmiResult.serviceCode) {
      case 'scUssd':
        // Bail out if there is nothing to show or if we got the .onsuccess
        // event after the .onussdevent.
        if (!mmiResult.statusMessage || this._pendingRequest === null) {
          return;
        }

        message.result = mmiResult.statusMessage;
        break;
      case 'scPin':
      case 'scPin2':
      case 'scPuk':
      case 'scPuk2':
        if (mmiResult.statusMessage) {
          message.result = this._(mmiResult.statusMessage);
        }
        break;
      case 'scCallForwarding':
        if (mmiResult.statusMessage) {
          message.result = this._(mmiResult.statusMessage);
          // Call forwarding requests via MMI codes might return an array of
          // nsIDOMMozMobileCFInfo objects. In that case we serialize that array
          // into a single string that can be shown on the screen.
          if (additionalInformation) {
            message.result = processCf(additionalInformation);
          }
        } else {
          message.type = 'mmi-error';
          message.error = this._('GenericFailure');
        }
        break;
      case 'scCallBarring':
      case 'scCallWaiting':
        message.result = this._(mmiResult.statusMessage);
        // If we are just querying the status of the service, we show a 
        // different message, so the user knows she hasn't change anything
        if (sentMMI === CALL_BARRING_STATUS_MMI_CODE ||
            sentMMI === CALL_WAITING_STATUS_MMI_CODE) {
          if (mmiResult.statusMessage === 'smServiceEnabled') {
            message.result = this._('ServiceIsEnabled');
          } else if (mmiResult.statusMessage === 'smServiceDisabled') {
            message.result = this._('ServiceIsDisabled');
          } else if (mmiResult.statusMessage === 'smServiceEnabledFor') {
            message.result = this._('ServiceIsEnabledFor');
          }
        }
        // Call barring and call waiting requests via MMI codes might return an
        // array of strings indicating the service it is enabled for or just
        // the disabled status message.
        if (mmiResult.statusMessage === 'smServiceEnabledFor' &&
            additionalInformation &&
            Array.isArray(additionalInformation)) {
          for (var i = 0, l = additionalInformation.length; i < l; i++) {
            message.result += '\n' + this._(additionalInformation[i]);
          }
        }
        break;
      default:
        // This would allow carriers and others to implement custom MMI codes
        // with title and statusMessage only.
        if (mmiResult.statusMessage) {
          message.result = this._(mmiResult.statusMessage) ?
                           this._(mmiResult.statusMessage) :
                           mmiResult.statusMessage;
        }
        break;
    }

    window.postMessage(message, this.COMMS_APP_ORIGIN);
  },

  notifyError: function mm_notifyError(evt) {
    var mmiError = evt.target.error;

    var ci = this.cardIndexForConnection(this._conn);
    var message = {
      type: 'mmi-error'
    };

    if (mmiError.serviceCode) {
      message.title = this.prependSimNumber(this._(mmiError.serviceCode), ci);
    }

    message.error = mmiError.name ?
      this._(mmiError.name) : this._('GenericFailure');

    switch (mmiError.serviceCode) {
      case 'scPin':
      case 'scPin2':
      case 'scPuk':
      case 'scPuk2':
        // If the error is related with an incorrect old PIN, we get the
        // number of remainings attempts.
        if (mmiError.additionalInformation &&
            (mmiError.name === 'emMmiErrorPasswordIncorrect' ||
             mmiError.name === 'emMmiErrorBadPin' ||
             mmiError.name === 'emMmiErrorBadPuk')) {
          message.error += '\n' + this._('emMmiErrorPinPukAttempts', {
            n: mmiError.additionalInformation
          });
        }
        break;
    }

    window.postMessage(message, this.COMMS_APP_ORIGIN);
  },

  openUI: function mm_openUI() {
    this.init((function onInitDone(_) {
      window.postMessage({type: 'mmi-loading'}, this.COMMS_APP_ORIGIN);
    }).bind(this));
  },

  /**
   * Create a notification/message string by prepending the SIM number if the
   * phone has more than one SIM card.
   *
   * @param text {String} The message text.
   * @param cardIndex {Integer} The SIM card slot index.
   * @return {String} Either the original string alone or with the SIM number
   *         prepended to it.
   */
  prependSimNumber: function mm_prependSimNumber(text, cardIndex) {
    if (window.navigator.mozIccManager &&
        window.navigator.mozIccManager.iccIds.length > 1) {
      var simName = this._('sim-number', { n: +cardIndex + 1 });

      text = this._(
        'mmi-notification-title-with-sim',
        { sim: simName, title: text }
      );
    }

    return text;
  },

  /**
   * Handles an MMI/USSD message. Pops up the MMI UI and displays the message.
   *
   * @param {String} message An MMI/USSD message.
   * @param {Boolean} sessionEnded True if this message ends the session, i.e.
   *        no more MMI messages will be sent in response to this one.
   * @param {Integer} cardIndex The index of the SIM card on which this message
   *        was received.
   */
  handleMMIReceived: function mm_handleMMIReceived(message, sessionEnded,
                                                   cardIndex)
  {
    this.init((function() {
      this._pendingRequest = null;
      // Do not notify the UI if no message to show.
      if (message == null && !sessionEnded) {
        return;
      }

      var conn = navigator.mozMobileConnections[cardIndex || 0];
      var operator = MobileOperator.userFacingInfo(conn).operator;
      var title = this.prependSimNumber(operator ? operator : '', cardIndex);
      var data = {
        type: 'mmi-received-ui',
        message: message,
        title: title,
        sessionEnded: sessionEnded
      };
      window.postMessage(data, this.COMMS_APP_ORIGIN);
    }).bind(this));
  },

  /**
   * Sends a notification for the specified message, returns a promise that is
   * resolved once the operation is finished.
   *
   * @param {String} message An MMI/USSD message.
   * @param {Integer} cardIndex The index of the SIM card on which this message
   *        was received.
   * @return {Promise} A promise that is resolved once the operation is
   *         finished.
   */
  sendNotification: function mm_sendNotification(message, cardIndex) {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.init(function() {
        var request = window.navigator.mozApps.getSelf();
        request.onsuccess = function(evt) {
          var app = evt.target.result;

          LazyLoader.load('/shared/js/notification_helper.js', function() {
            var iconURL = NotificationHelper.getIconURI(app, 'dialer');
            var clickCB = function(evt) {
              evt.target.close();
              self.handleMMIReceived(message, /* sessionEnded */ true,
                                     cardIndex);
            };
            var conn = navigator.mozMobileConnections[cardIndex || 0];
            var operator = MobileOperator.userFacingInfo(conn).operator;
            var title = self.prependSimNumber(operator ? operator : '',
                                              cardIndex);
            /* XXX: Bug 1033254 - We put the |ussd-message=1| parameter in the
             * URL string to distinguish this notification from the others.
             * This should be thorought the application possibly by using the
             * tag field. */
            var notification = new Notification(title, {
              body: message,
              icon: iconURL + '?ussdMessage=1&cardIndex=' + cardIndex,
              tag: Date.now()
            });
            notification.addEventListener('click', clickCB);
            resolve();
          });
        };
        request.onerror = function(error) {
          reject(error);
        };
      });
    });
  },

  isMMI: function mm_isMMI(number, cardIndex) {
    var cdmaTypes = ['evdo0', 'evdoa', 'evdob', '1xrtt', 'is95a', 'is95b'];
    var conn = navigator.mozMobileConnections[cardIndex || 0];
    var voiceType = conn.voice ? conn.voice.type : null;
    var supportedNetworkTypes = conn.supportedNetworkTypes;
    var imeiWhitelist = function mm_imeiWhitelist(element) {
      return (['gsm', 'lte', 'wcdma'].indexOf(element) !== -1);
    };

    if ((number === '*#06#') && supportedNetworkTypes.some(imeiWhitelist)) {
      // Requesting the IMEI code works on phones supporting a GSM network
      return true;
    } else if (cdmaTypes.indexOf(voiceType) !== -1) {
      // If we're on a CDMA network USSD/MMI numbers are not available
      return false;
    } else {
      var telephony = navigator.mozTelephony;
      var onCall = telephony && !!(telephony.calls.length ||
                                   telephony.conferenceGroup.calls.length);
      var shortString = (number.length <= 2);
      var doubleDigitAndStartsWithOne = (number.length === 2) &&
                                        number.startsWith('1');

      /* A valid USSD/MMI code is any 'number' ending in '#' or made of only
       * one or two characters with the exception of two-character codes
       * starting with 1 which are considered MMI codes only when dialed during
       * a call (see 3GPP TS 20.030 6.3.5.2). */
      return (number.charAt(number.length - 1) === '#') ||
             (shortString && (onCall || !doubleDigitAndStartsWithOne));
    }
  },

  handleEvent: function mm_handleEvent(evt) {
    if (!evt.type) {
      return;
    }

    switch (evt.type) {
      case 'message':
        if (evt.origin !== this.COMMS_APP_ORIGIN) {
          return;
        }
        switch (evt.data.type) {
          case 'mmi-reply':
            this.send(evt.data.message,
                      this.cardIndexForConnection(this._conn));
            break;
          case 'mmi-cancel':
            if (this._conn) {
              this._conn.cancelMMI();
              this._conn = null;
            }
            break;
        }

        return;
    }
  },

  cardIndexForConnection: function mm_cardIndexForConnection(conn) {
    for (var i = 0; i < navigator.mozMobileConnections.length; i++) {
      if (conn == navigator.mozMobileConnections[i]) {
        return i;
      }
    }

    return 0;
  },

  /**
   * Retrieves the IMEI code for the specified SIM card slot.
   *
   * @param {Integer} cardIndex The index of the SIM card slot.
   * @returns {Promise} A promise that resolves to the IMEI code for the slot
   *          upon successful completion or rejects upon failure.
   */
  _getImeiForCard: function mm_getImeiForCard(cardIndex) {
    return new Promise(function(resolve, reject) {
      var request = navigator.mozMobileConnections[cardIndex]
                             .sendMMI('*#06#');
      request.onsuccess = function mm_onGetImeiSuccess(event) {
        var result = event.target.result;

        // We always expect the IMEI, so if we got a .onsuccess event
        // without the IMEI value, we throw an error message.
        if ((result === null) || (result.serviceCode !== 'scImei') ||
            (result.statusMessage === null)) {
          reject(new Error('Could not retrieve the IMEI code for SIM' +
                           cardIndex));
        }

        resolve(result.statusMessage);
      };
      request.onerror = function mm_onGetImeiError(error) {
        reject(error);
      };
    });
  },

  /**
   * Sends the necessary MMI messages to retrieve IMEI codes for all SIM slots
   * and displays the resulting codes on the screen.
   *
   * @returns {Promise} A promise that is resolved when the operation has been
   *          completed.
   */
  showImei: function mm_showImei() {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.init(function() {
        var promises = [];

        for (var i = 0; i < navigator.mozMobileConnections.length; i++) {
          promises.push(self._getImeiForCard(i));
        }

        self.openUI();

        Promise.all(promises).then(function(imeis) {
          window.postMessage({
            type: 'mmi-success',
            title: self._('scImei'),
            result: imeis.join('\n')
          }, self.COMMS_APP_ORIGIN);
          resolve();
        }, function(reason) {
          window.postMessage({
            type: 'mmi-error',
            error: self._('GenericFailure')
          }, self.COMMS_APP_ORIGIN);
          reject(reason);
        });
      });
    });
  }
};
