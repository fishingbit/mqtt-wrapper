import { PolymerElement } from '../../@polymer/polymer/polymer-element.js';
/**
@license
Copyright 2017 Sebastian Raff <hq@ccu.io> https://github.com/hobbyquaker

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/**
Polymer Element that wraps other Elements and links them to MQTT topics. Needs a `mqtt-connection` element.


## Installation

`npm install @hobbyquaker/mqtt-wrapper`


## Imports and mqtt-connection

```html
<script src="bower_components/webcomponentsjs/webcomponents-lite.js"></script>
<link rel="import" href="bower_components/polymer/polymer.html">

<link rel="import" href="bower_components/mqtt-connection/mqtt-connection.html">
<link rel="import" href="bower_components/mqtt-wrapper/mqtt-wrapper.html">

<mqtt-connection host="mqtt-broker" port="8080"></mqtt-connection>
```


## Usage Examples

Inserts the last received message on the MQTT topic `test/info` as innerHTML to the wrapped div:
```html
<mqtt-wrapper sub='[{"topic":"test/info","content":"html"}]'>
    <div></div>
</mqtt-wrapper>
```

Wrap a paper-button and publish the payload `1` on the MQTT topic `test/button` when the button is clicked:
```html
<mqtt-wrapper pub='[{"event":"click","topic":"test/button","payload":"1"}]'>
    <paper-button>Licht an</paper-button>
</mqtt-wrapper>
```

Wrap a paper-button and publish the payload `true` when the button is pressed and the payload `false` when it's released:
```html
<mqtt-wrapper pub='[{"event":"down up","topic":"test/button","attribute":"pressed"}]'>
    <paper-button>Test</paper-button>
</mqtt-wrapper>
```

Wrapping a paper-toggle-button and linking it to [hue2mqtt.js](https://github.com/hobbyquaker/hue2mqtt.js)
topics to switch a Hue lamp on and off:
```html
<mqtt-wrapper
        sub='[{"topic":"hue/status/lights/Hobbyraum/on","attribute":"checked","json":"val","type":"boolean"}]'
        pub='[{"event":"change","topic":"hue/set/lights/Hobbyraum/on","attribute":"checked"}]'>

    <paper-toggle-button></paper-toggle-button>

</mqtt-wrapper>
```

Wrapping a paper-slider and linking it to hue2mqtt.js topics to control a Hue lamps brightness. Slider will be disabled
when the lamp is off:
```html
<mqtt-wrapper
        sub='[{"topic":"hue/status/lights/Hobbyraum/bri","attribute":"value","json":"val","disable":"dragging"},{"topic":"hue/status/lights/Hobbyraum/on","attribute":"disabled","json":"val","type":"boolean","negate":true}]'
        pub='[{"event":"change","topic":"hue/set/lights/Hobbyraum/bri","attribute":"value"},{"event":"immediate-value-change","topic":"hue/set/lights/Hobbyraum/bri","attribute":"immediateValue"}]'>

    <paper-slider max="254"></paper-slider>

</mqtt-wrapper>
```

Wrapping google-map and google-map-marker elements and link them to [owntracks](http://owntracks.org/) MQTT messages.
We need 2 mqtt-wrapper elements here, because both the google-map and the google-map-marker need the longitude and
latitude attributes, so the area with the marker is brought in view.
```html
<mqtt-wrapper selector="google-map" sub='[{"topic":"owntracks/basti/iphone7","attribute":"latitude","json":"lat"},{"topic":"owntracks/basti/iphone7","attribute":"longitude","json":"lon"}]'>
    <mqtt-wrapper selector="google-map-marker" sub='[{"topic":"owntracks/basti/iphone7","attribute":"latitude","json":"lat"},{"topic":"owntracks/basti/iphone7","attribute":"longitude","json":"lon"}]'>
        <google-map api-key="1234" fit-to-markers>
            <google-map-marker title="Basti"></google-map-marker>
        </google-map>
    </mqtt-wrapper>
</mqtt-wrapper>
```


@customElement
@element mqtt-wrapper
@polymer
*/
class MqttWrapper extends PolymerElement {
    static get is() { return 'mqtt-wrapper'; }
    static get properties() {
        return {
            /**
             * Array defining mqtt topics to subscribe and what to do with incoming messages
             * #### SubscriptionConfig properties
             * * __topic__: String
             *
             *   MQTT topic to subscribe
             * * __attribute__: String
             *
             *   An attribute of the child element that should be set on incoming MQTT messages.
             * * __type__: String
             *
             *   Set to `boolean` if the attribute that should be set is of type Boolean.
             * * __json__: String
             *
             *   If you're using JSON payloads in your MQTT messages you can set a property of the JSON object
             *   here that should be used.
             * * __content__: String
             *
             *   Use `text` or `html` to set the MQTT message as innerHTML or innerText of the child element.
             *   Either use attribute _or_ content.
             * * __disable__: String
             *
             *   You can set an attribute name of the child element here that will prevent updates if true.
             *   Useful e.g. to prevent slider updates while the user is dragging the slider (see examples).
             *
             * @type {Array<SubscriptionConfig>}
             */
            sub: {
                type: Array,
                observer: '__subChange'
            },

            /**
             * Array defining events of the wrapped element that should trigger a mqtt publish and what to publish.
             * #### PublishConfig properties
             * * __event__: String
             *
             *   An event of the child element that should trigger a MQTT publish. You can add multiple
             *   space-separated events at once.
             * * __attribute__: String
             *
             *   An attribute of the child element that value should be used as publish payload.
             * * __payload__: String
             *
             *   A fixed payload that should be published (either use attribute _or_ payload).
             * * __retain__: Boolean (optional, default: `false`)
             *
             *   Whether the message should be published retained
             * * __negate__: Boolean (optional, default: `false`)
             *
             *   Negate the payload. Useful e.g. to set a disabled attribute when the payload is false.
             *
             * @type {Array<PublishConfig>}
             */
            pub: {
                type: Array,
                observer: '__pubChange'
            },

            /**
             *  Don't set attribute `disabled` on child element if MQTT connection is lost.
             */
            noDisable: {
                type: Boolean,
                value: false,
                observer: '__noDisableChange'
            },

            /**
             *  The child element the wrapper should work on.
             */
            selector: {
                type: String,
                value: '*:first-child'
            }
        }
    }

    connectedCallback() {
        this.__mqtt = document.querySelector('mqtt-connection');
        this.__child = this.querySelector(this.selector);
        this.__eventHandlers = [];
        this.__subscriptions = [];

        super.connectedCallback();
    }

    disconnectedCallback() {
        this.__removeSubscriptions();
        this.__removeEventHandlers();

        super.disconnectedCallback();
    }

    __removeEventHandlers() {
        this.__eventHandlers.forEach(eh => {
            this.__child.removeEventListener(eh.event, eh.handler);
        });
        this.__eventHandlers = [];
    }

    __addEventHandlers() {
        if (this.pub && this.pub.length > 0) {
            this.pub.forEach(conf => {
                const handler = () => {
                    if (typeof conf.payload !== 'undefined') {
                        this.__mqtt.publish(conf.topic, conf.payload, {retain: conf.retain || false});
                    } else if (typeof conf.attribute !== 'undefined') {
                        this.__mqtt.publish(conf.topic, this.__child[conf.attribute], {retain: conf.retain || false});
                    }
                };
                conf.event.split(' ').forEach(event => {
                    this.__eventHandlers.push({event, handler});
                    this.__child.addEventListener(event, handler);
                });
            });
        }
    }

    __removeSubscriptions() {
        this.__subscriptions.forEach(sid => {
            this.__mqtt.unsubscribe(sid);
        });
        this.__subscriptions = [];
    }

    __addSubscriptions() {
        if (this.sub && this.sub.length > 0) {
            this.sub.forEach(conf => {
                this.__subscriptions.push(this.__mqtt.subscribe(conf.topic, payload => {
                    if (typeof conf.disable !== 'undefined') {
                        if (this.__child[conf.disable]) {
                            return;
                        }
                    }
                    if (typeof conf.json !== 'undefined' && payload.indexOf('{') !== -1) {
                        try {
                            payload = JSON.parse(payload)[conf.json];
                        } catch (err) {
                            console.error('json parse failed');
                        }
                    }
                    if (conf.negate) {
                        payload = !payload;
                    }
                    if (typeof conf.attribute !== 'undefined') {
                        if (conf.type === 'boolean' && !payload) {
                            this.__child.removeAttribute(conf.attribute);
                        } else {
                            this.__child.setAttribute(conf.attribute, payload);
                        }
                    } else if (conf.content === 'html') {
                        this.__child.innerHTML = payload;
                    } else if (conf.content === 'text') {
                        this.__child.textContent = payload;
                    }
                }));
            });
        }
    }

    /**
     * Call this method when the wrapped element has changed.
     */
    refresh() {
        this.__removeEventHandlers();
        this.__removeSubscriptions();
        this.__child = this.querySelector(this.selector);
        this.__addEventHandlers();
        this.__addSubscriptions();
    }

    __subChange() {
        this.__removeSubscriptions();
        this.__addSubscriptions();
    }

    __pubChange() {
        this.__removeEventHandlers();
        this.__addEventHandlers();
    }

    __noDisableChange() {
        if (!this.noDisable) {
            this.__connectedChangeHandler = event => {
                if (event.detail.value) {
                    this.__child.removeAttribute('disabled')
                } else {
                    this.__child.setAttribute('disabled', true);
                }
            };
            this.__mqtt.addEventListener('connected-changed', this.__connectedChangeHandler);
        } else {
            if (this.__connectedChangeHandler) {
                this.__mqtt.removeEventListener('connected-change', this.__connectedChangeHandler);
            }
        }
    }
}

customElements.define(MqttWrapper.is, MqttWrapper);
