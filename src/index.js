"use strict";
(function() {
  function WindowPopup(url, name, options, callbackUrl) {
    this.popup = undefined;
    this.$window = window;
    this.url = url;
    this.name = name;
    this.options = options;
    this.callbackUrl = callbackUrl;
  }

  WindowPopup.prototype.stringifyOptions = function(options) {
    const parts = [];
    for(var key in options) {
      parts.push(key + '=' + options[key]);
    }
      return parts.join(',');
  };

  WindowPopup.open = function(url, name, options, callbackUrl) {
    return new this(url, name, options, callbackUrl).open();
  }

  /**
   * open popup
   */
  WindowPopup.prototype.open = function() {
    const width = this.options.width || 500;
      const height = this.options.height || 500;
      const options = this.stringifyOptions({
        width: width,
        height: height,
        top: this.$window.screenY + ((this.$window.outerHeight - height) / 2.5),
        left: this.$window.screenX + ((this.$window.outerWidth - width) / 2)
      });
      const name = this.$window['cordova'] || this.$window.navigator.userAgent.indexOf('CriOS') > -1 ? '_blank' : this.name;
      this.popup = this.$window.open(this.url, name, options);
      if (this.popup && this.popup.focus) {
        this.popup.focus();
      }
    if (this.$window['cordova']) {
        return this.eventListener();
      } else {
        if (this.url === 'about:blank') {
          this.popup.location = url;
        }
        return this.polling();
      }

  };

  WindowPopup.prototype.requestGet = function(code, done) {
    // Old compatibility code, no longer needed.
    if (window.XMLHttpRequest) { // Mozilla, Safari, IE7+ ...
        httpRequest = new XMLHttpRequest();
    } else if (window.ActiveXObject) { // IE 6 and older
        httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
    }
      httpRequest.onreadystatechange = function() {
          if (httpRequest.readyState == XMLHttpRequest.DONE ) {
             if (httpRequest.status == 200) {
                var data = JSON.parse(httpRequest.responseText);
                if(data.status === 200) {
                  done(null, data.data);
                } else {
                  done(data.data);
                }
                 
             }
             else {
                 done(new Error("400"));
             }
          }
      };

      httpRequest.open("GET", this.url + "?code=" + code, true);
      httpRequest.send();
  }

  /**
   * polling
   * @param {String} redirectUri
   * @return {Promise}
   */
  WindowPopup.prototype.polling = function() {
    const redirectUri = this.callbackUrl;
    return new Promise((resolve, reject) => {
      const redirectUriParser = document.createElement('a');
      redirectUriParser.href = redirectUri;
      const redirectUriPath = getFullUrlPath(redirectUriParser);


    const polling = setInterval(() => {
    if (!this.popup || this.popup.closed || this.popup.closed === undefined) {
      clearInterval(polling);
      reject(new Error('The popup window was closed'));
    }

    try {
      const popupWindowPath = getFullUrlPath(this.popup.location);
      if (popupWindowPath === redirectUriPath) {
        if (this.popup.location.search || this.popup.location.hash) {
            const query = parseQueryString(this.popup.location.search.substring(1).replace(/\/$/, ''));
        const hash = parseQueryString(this.popup.location.hash.substring(1).replace(/[\/$]/, ''));
        const params = Object.assign(query, hash);
        console.log(params);
        if (params.error) {
          reject(new Error(params.error));
        } else {
          this.requestGet(params.code, (err, data) => {
            if(err) {
              reject(err);
            } else {
              resolve(data);
            }
          })
          
        }
        clearInterval(polling);
          this.popup.close();
        } else {
          reject(new Error(
            'OAuth redirect has occurred but no query or hash parameters were found. ' +
            'They were either not set during the redirect, or were removed—typically by a ' +
            'routing library—before Satellizer could read it.'
          ));
        }

        
      }
    } catch (error) {
      // Ignore DOMException: Blocked a frame with origin from accessing a cross-origin frame.
      // A hack to get around same-origin security policy errors in IE.
    }
    }, 500);
    });
  }

  /**
   * eventListener
   * @param {String} redirectUri
   * @return {Promise}
   */
  WindowPopup.prototype.eventListener = function() {
    const redirectUri = this.callbackUrl;
    return new Promise((resolve, reject) => {
      this.popup.addEventListener('loadstart', (event) => {
        if (event.url.indexOf(redirectUri) !== 0) {
          return;
        }
        const parser = document.createElement('a');
        parser.href = event.url;
        if (parser.search || parser.hash) {
          const query = parseQueryString(parser.search.substring(1).replace(/\/$/, ''));
      const hash = parseQueryString(parser.hash.substring(1).replace(/[\/$]/, ''));
      const params = Object.assign(query, hash);

      if (params.error) {
        reject(new Error(params.error));
      } else {
        this.requestGet(params.code, (err, data) => {
          if(err) {
            reject(err);
          } else {
            resolve(data);
          }
        })
      }
          this.popup.close();
        }
      });
      this.popup.addEventListener('loaderror', () => {
        reject(new Error('Authorization failed'));
      });

      this.popup.addEventListener('exit', () => {
        reject(new Error('The popup window was closed'));
      });
    });
  }

  function getFullUrlPath (location) {
    const isHttps = location.protocol === 'https:';
    return location.protocol + '//' + location.hostname +
      ':' + (location.port || (isHttps ? '443' : '80')) +
      (/^\//.test(location.pathname) ? location.pathname : '/' + location.pathname);
  }

  function parseQueryString (str) {
    let obj = {};
    let key;
    let value;
    (str || '').split('&').forEach((keyValue) => {
      if (keyValue) {
        value = keyValue.split('=');
        key = decodeURIComponent(value[0]);
        obj[key] =value[1] ? decodeURIComponent(value[1]) : true;
      }
    });
    return obj;
  }
  window.WindowPopup = WindowPopup;
})();