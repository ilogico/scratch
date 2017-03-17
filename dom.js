'use strict';

const setProperties = (component, target, properties) => Object.keys(properties).forEach(key => {
    const value = properties[key];

    if (value instanceof Observable) {
        const subs
    }
});


class Component {
    constructor(properties, children) {
        this.removed = new Promise(() => {/*TODO*/ });
        this.store = new Store();
        const propertiesState = {};
        new.target.observableProperties.forEach(key => {
            if (key in properties) {
                propertiesState[key] = value;
            }
            Object.defineProperty(this, key, {
                get: () => this.store.state[key],
                set: value => {
                    this.store.updateState({[key]: value});
                }
            });
        });
        this.store.setState(propertiesState);
    }

    set something(value) {

    }
    setProperties(target, properties) {
        for (const [key, value] of Object.entries(properties)) {
            if (value instanceof Observable) {
                const subscription = value.subscribe(({ value }) => target[key] = value);
                this.removed.then(() => subscription.unsubscribe());
                target[key] = value.current;
            } else if (typeof value === 'function') {
                target.addEventListener(key, value, false);
            } else if (typeof value === 'object') {
                setProperties(target[key], value);
            } else {
                target[key] = value;
            }
        }
    }
}