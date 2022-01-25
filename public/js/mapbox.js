export const displayMap = (locations) => {
    mapboxgl.accessToken =
        'pk.eyJ1IjoiY2VzYXI5MGNmciIsImEiOiJja3h5eDgwOWUyMDA0Mm9wZHR6cTc2OXh3In0.uGQyirxD1kwgrX9GUrM1QA';
    var map = new mapboxgl.Map({
        // en container se pone el id del contenedor donde queremos el mapa
        container: 'map',
        // este se puede generar en el mapbox studio
        style: 'mapbox://styles/cesar90cfr/ckxyxh3zn3i2416l7knw9odd8',
        // en center debe pasar un arreglo de dos coordenadas
        // center: [], //promero la longitud y luego la latitud
        // zoom: 5,
        // // con esto se va a hacer estatico el mapa
        // interactive: false,
        // para desactivar poder hacer zoom
        scrollZoom: false,
    });

    // tenemos acceso a la clase porque la incluimos al inicio de todo
    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach((loc) => {
        // add a marker
        const el = document.createElement('div');
        el.className = 'marker';

        // create marker
        new mapboxgl.Marker({
            // elemento que se va a poner como ancla
            element: el,
            // la parte de abajo del elemento se va a ubica exactamente en el final
            anchor: 'bottom',
            // recordemos que las coordenadas las pusimos en una arreglo de 2 lng-lat
        })
            .setLngLat(loc.coordinates)
            .addTo(map);

        // POPUP
        new mapboxgl.Popup({
            offset: 30,
        })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map);

        // extend map bounds to include location
        bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100,
        },
    });
};
