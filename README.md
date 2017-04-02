# window-popup

# Example
```js
WindowPopup.open(
  "http://example.com/auth/facebook", 
  "popup", 
  {width: 100, height:100}, 
  "http://example.com/auth/facebook/callback")
.then(data => {
  // handler success
}).catch(err => {
  // handler error
})
```
