
const noop = () => { };

const init = ({ get = noop, post = noop }) => {
    document.addEventListener('click', async event => {
        if (!isNavigation(event)) {
            return;
        }
        let url = new URL(event.target.href);
        if (url.origin !== location.origin) {
            return;
        }
        let routingInfo = makeRoutingInfo(url);
        let action = get(routingInfo);
        if (!action) {
            return;
        }
        event.preventDefault();

        try {
            dispatch(await action({}));
        } catch (error) {
            dispatch({
                status: 500,
                data: error && error.stack || '' + error
            });
        }

    }, false);
};

const isNavigation = event => {
    const { target } = event;
    return target.tagName === 'A'
        && !target.download
        && (!target.target || target.target === '_self');
};

/**
 * 
 * @param {URL} url 
 */
const makeRoutingInfo = url => {
    return {
        path: url.pathname,
        prefix: '',
        pathParams: {},

        hash: url.hash,
        host: url.host,
        hostname: url.hostname,
        href: url.href,
        origin: url.origin,
        password: url.password,
        pathname: url.pathname,
        port: url.port,
        protocol: url.protocol,
        search: url.search,
        searchParams: url.searchParams,
        username: url.username
    };
}