// ============================================================
// WORLD MAP MODULE — live global operations map
// ------------------------------------------------------------
// Renders an interactive world map on the dashboard and plots
// every mission as a departure -> destination flight route.
// Subscribes to the missions collection so it updates live as
// trips are added, dispatched, or change status.
//
// Requires d3 (v7) and topojson (v3) loaded globally, plus the
// world-atlas countries TopoJSON fetched at runtime.
// ============================================================

(function () {
    // Airport coordinates: ICAO -> [lng, lat, label]
    const AIRPORTS = {
        KTEB:[-74.0608,40.8501,'Teterboro, NJ'], KSDL:[-111.9106,33.6229,'Scottsdale, AZ'],
        MMTO:[-99.5660,19.3371,'Toluca, MX'], KSAT:[-98.4690,29.5337,'San Antonio, TX'],
        KPDK:[-84.3020,33.8756,'Atlanta PDK, GA'], KMIA:[-80.2906,25.7959,'Miami, FL'],
        KPHL:[-75.2411,39.8719,'Philadelphia, PA'], KDFW:[-97.0380,32.8968,'Dallas/Ft Worth, TX'],
        KJFK:[-73.7781,40.6413,'New York JFK'], KLGA:[-73.8740,40.7769,'New York LGA'],
        KEWR:[-74.1745,40.6895,'Newark, NJ'], KBOS:[-71.0096,42.3656,'Boston, MA'],
        KIAD:[-77.4558,38.9531,'Washington Dulles'], KDCA:[-77.0377,38.8512,'Washington National'],
        KATL:[-84.4277,33.6407,'Atlanta, GA'], KORD:[-87.9048,41.9742,'Chicago O’Hare'],
        KMDW:[-87.7522,41.7868,'Chicago Midway'], KLAX:[-118.4085,33.9416,'Los Angeles'],
        KSFO:[-122.3790,37.6213,'San Francisco'], KSEA:[-122.3088,47.4502,'Seattle'],
        KLAS:[-115.1523,36.0840,'Las Vegas'], KDEN:[-104.6737,39.8561,'Denver'],
        KIAH:[-95.3414,29.9902,'Houston Bush'], KHOU:[-95.2789,29.6454,'Houston Hobby'],
        KPHX:[-112.0116,33.4342,'Phoenix'], KMCO:[-81.3081,28.4312,'Orlando'],
        KFLL:[-80.1527,26.0726,'Fort Lauderdale'], KSLC:[-111.9778,40.7884,'Salt Lake City'],
        KMSP:[-93.2218,44.8820,'Minneapolis'], KDTW:[-83.3554,42.2124,'Detroit'],
        KCLT:[-80.9431,35.2140,'Charlotte'], KBNA:[-86.6782,36.1245,'Nashville'],
        KAUS:[-97.6699,30.1945,'Austin'], KSAN:[-117.1897,32.7338,'San Diego'],
        KPDX:[-122.5951,45.5887,'Portland'], KMEM:[-89.9767,35.0424,'Memphis'],
        TJSJ:[-66.0018,18.4394,'San Juan, PR'], PHNL:[-157.9224,21.3187,'Honolulu'],
        CYYZ:[-79.6306,43.6777,'Toronto'], CYUL:[-73.7408,45.4706,'Montreal'],
        CYVR:[-123.1840,49.1967,'Vancouver'], MMMX:[-99.0721,19.4363,'Mexico City'],
        MMUN:[-86.8771,21.0365,'Cancun'], MMGL:[-103.3110,20.5218,'Guadalajara'],
        MROC:[-84.2090,9.9939,'San Jose, CR'], MPTO:[-79.3835,9.0714,'Panama City'],
        SKBO:[-74.1469,4.7016,'Bogota'], SBGR:[-46.4731,-23.4356,'Sao Paulo'],
        SAEZ:[-58.5358,-34.8222,'Buenos Aires'], EGLL:[-0.4543,51.4700,'London Heathrow'],
        EGGW:[-0.3683,51.8747,'London Luton'], LFPB:[2.4414,48.9694,'Paris Le Bourget'],
        LFPG:[2.5479,49.0097,'Paris CDG'], EDDF:[8.5622,50.0379,'Frankfurt'],
        EHAM:[4.7639,52.3086,'Amsterdam'], LSGG:[6.1090,46.2381,'Geneva'],
        LSZH:[8.5492,47.4647,'Zurich'], LEMD:[-3.5680,40.4719,'Madrid'],
        LIRF:[12.2389,41.8003,'Rome'], LOWW:[16.5697,48.1103,'Vienna'],
        OMDB:[55.3644,25.2532,'Dubai'], OTHH:[51.6081,25.2731,'Doha'],
        LTFM:[28.7270,41.2753,'Istanbul'], VHHH:[113.9185,22.3080,'Hong Kong'],
        WSSS:[103.9915,1.3592,'Singapore'], RJTT:[139.7798,35.5494,'Tokyo Haneda'],
        ZBAA:[116.5846,40.0801,'Beijing'], YSSY:[151.1772,-33.9461,'Sydney'],
        FAOR:[28.2460,-26.1392,'Johannesburg'], HECA:[31.4056,30.1219,'Cairo']
    };
    const ACTIVE = ['active','dispatched','in transit','in_transit','enroute','en route','on_mission','ferry'];

    let _atlas = null;
    let _channel = null;

    function resolve(code) {
        if (!code) return null;
        const k = String(code).trim().toUpperCase();
        return AIRPORTS[k] || null;
    }
    function isActive(status) {
        return ACTIVE.indexOf(String(status || '').toLowerCase()) !== -1;
    }
    async function loadAtlas() {
        if (_atlas) return _atlas;
        const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        _atlas = await res.json();
        return _atlas;
    }

    function drawBase(host, atlas) {
        host.innerHTML = '';
        const w = host.clientWidth || 800;
        const h = host.clientHeight || 420;

        const svg = d3.select(host).append('svg')
            .attr('viewBox', '0 0 ' + w + ' ' + h)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        const root = svg.append('g').attr('class', 'wm-zoomroot');
        const projection = d3.geoNaturalEarth1().fitSize([w, h], { type: 'Sphere' });
        const path = d3.geoPath(projection);

        root.append('path').attr('class', 'wm-sphere').attr('d', path({ type: 'Sphere' }));
        root.append('path').attr('class', 'wm-graticule').attr('d', path(d3.geoGraticule10()));

        const countries = topojson.feature(atlas, atlas.objects.countries).features;
        root.append('g').selectAll('path').data(countries).enter().append('path')
            .attr('class', 'wm-country').attr('d', path);

        const gRoutes = root.append('g').attr('class', 'wm-routes');
        const gDots = root.append('g').attr('class', 'wm-dots');

        const zoom = d3.zoom().scaleExtent([1, 8]).on('zoom', function (ev) {
            root.attr('transform', ev.transform);
        });
        svg.call(zoom).on('dblclick.zoom', null);

        host._wm = { svg: svg, root: root, gRoutes: gRoutes, gDots: gDots, projection: projection, path: path };
    }

    function tip(html, x, y) {
        const el = document.getElementById('map-tooltip');
        if (!el) return;
        if (html === null) { el.style.opacity = '0'; return; }
        el.innerHTML = html;
        el.style.opacity = '1';
        const host = document.getElementById('world-map');
        const maxX = (host ? host.clientWidth : 800) - el.offsetWidth - 12;
        el.style.left = Math.max(8, Math.min(x + 14, maxX)) + 'px';
        el.style.top = Math.max(8, y + 14) + 'px';
    }

    function updateRoutes(host, missions) {
        const wm = host._wm;
        if (!wm) return;
        const proj = wm.projection;

        const routes = [];
        const dotMap = {};
        (missions || []).forEach(function (m) {
            const a = resolve(m.departure), b = resolve(m.destination);
            if (a) dotMap[m.departure.toUpperCase()] = { c: a, active: isActive(m.status) || dotMap[m.departure.toUpperCase()] && dotMap[m.departure.toUpperCase()].active };
            if (b) dotMap[m.destination.toUpperCase()] = { c: b, active: isActive(m.status) || dotMap[m.destination.toUpperCase()] && dotMap[m.destination.toUpperCase()].active };
            if (!a || !b) return;
            const interp = d3.geoInterpolate([a[0], a[1]], [b[0], b[1]]);
            const pts = [];
            for (let i = 0; i <= 40; i++) pts.push(interp(i / 40));
            routes.push({ m: m, line: { type: 'LineString', coordinates: pts }, active: isActive(m.status) });
        });

        const rsel = wm.gRoutes.selectAll('path').data(routes);
        rsel.exit().remove();
        rsel.enter().append('path').merge(rsel)
            .attr('class', function (d) { return 'wm-route' + (d.active ? ' wm-route-active' : ''); })
            .attr('d', function (d) { return wm.path(d.line); })
            .on('mousemove', function (ev, d) {
                const r = host.getBoundingClientRect();
                tip('<strong>' + (d.m.type || 'Mission') + '</strong><br>' +
                    (d.m.clientName || '') + '<br>' +
                    (d.m.departure || '?') + ' → ' + (d.m.destination || '?') +
                    '<br><span style="opacity:.7">' + (d.m.status || '') + '</span>',
                    ev.clientX - r.left, ev.clientY - r.top);
            })
            .on('mouseleave', function () { tip(null); });

        const dots = Object.keys(dotMap).map(function (k) { return { code: k, c: dotMap[k].c, active: dotMap[k].active }; });
        const dsel = wm.gDots.selectAll('g').data(dots, function (d) { return d.code; });
        dsel.exit().remove();
        const gEnter = dsel.enter().append('g');
        gEnter.append('circle').attr('class', 'wm-pulse');
        gEnter.append('circle').attr('class', 'wm-dot');
        const gAll = gEnter.merge(dsel);
        gAll.attr('transform', function (d) { const p = proj([d.c[0], d.c[1]]); return 'translate(' + p[0] + ',' + p[1] + ')'; });
        gAll.select('.wm-pulse').attr('r', 4).style('display', function (d) { return d.active ? 'block' : 'none'; });
        gAll.select('.wm-dot').attr('r', 3.2).attr('class', function (d) { return d.active ? 'wm-dot wm-dot-active' : 'wm-dot'; })
            .on('mousemove', function (ev, d) {
                const r = host.getBoundingClientRect();
                tip('<strong>' + d.code + '</strong><br><span style="opacity:.7">' + d.c[2] + '</span>', ev.clientX - r.left, ev.clientY - r.top);
            })
            .on('mouseleave', function () { tip(null); });
    }

    async function loadMissions() {
        try {
            const { data } = await sb.from('missions').select('data');
            const node = document.getElementById('world-map');
            if (node && node._wm) updateRoutes(node, (data || []).map(function (r) { return r.data; }));
        } catch (e) { /* leave base map */ }
    }

    window.initWorldMap = async function () {
        const host = document.getElementById('world-map');
        if (!host) return;
        if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
            host.innerHTML = '<div class="map-empty">Map libraries are still loading…</div>';
            return;
        }
        let atlas;
        try { atlas = await loadAtlas(); }
        catch (e) { host.innerHTML = '<div class="map-empty">Could not load map data.</div>'; return; }

        drawBase(host, atlas);

        loadMissions();
        try {
            if (_channel) { try { sb.removeChannel(_channel); } catch (e) {} _channel = null; }
            _channel = sb.channel('missions-rt')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, function () { loadMissions(); })
                .subscribe();
        } catch (e) { /* realtime not enabled — on-load fetch still populates the map */ }
    };
})();
