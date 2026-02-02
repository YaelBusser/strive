import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface LeafletMapProps {
    routeCoordinates?: { latitude: number; longitude: number }[];
    markers?: { latitude: number; longitude: number; title?: string; color?: string }[];
    location?: { latitude: number; longitude: number } | null;
    isTracking?: boolean;
    interactive?: boolean;
}

const LeafletMap = forwardRef(({ routeCoordinates = [], markers = [], location = null, isTracking = false, interactive = true }: LeafletMapProps, ref) => {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>body, html, #map { height: 100%; margin: 0; padding: 0; background: #121212; }</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false,
            zoomSnap: 0.5
        }).setView([48.8566, 2.3522], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20
        }).addTo(map);

        var polyline = L.polyline([], {color: '#FD9500', weight: 6}).addTo(map);
        var markerLayer = L.layerGroup().addTo(map);
        var userLocationMarker = null;

        var dotIcon = L.divIcon({
            className: 'user-marker',
            html: '<div style="width: 12px; height: 12px; background: #3B82F6; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        // Handle messages from React Native
        document.addEventListener('message', function(event) {
           handleMessage(event.data);
        });
        
        window.addEventListener('message', function(event) {
           handleMessage(event.data);
        });

        function handleMessage(dataString) {
           try {
               console.log('[Leaflet WebView] Received message:', dataString);
               var data = JSON.parse(dataString);
               
               if (data.type === 'updatePath') {
                   var latlngs = data.coords.map(c => [c.latitude, c.longitude]);
                   polyline.setLatLngs(latlngs);
                   if (data.follow && latlngs.length > 0) {
                       map.panTo(latlngs[latlngs.length - 1], {animate: true});
                   }
               }

               if (data.type === 'setUserLocation') {
                   console.log('[Leaflet WebView] Setting user location:', data.lat, data.lon);
                   var lat = data.lat;
                   var lon = data.lon;
                   var latlng = [lat, lon];

                   if (!userLocationMarker) {
                       userLocationMarker = L.marker(latlng, {icon: dotIcon}).addTo(map);
                       map.setView(latlng, 16); 
                       console.log('[Leaflet WebView] Created marker and centered');
                   } else {
                       userLocationMarker.setLatLng(latlng);
                       console.log('[Leaflet WebView] Updated marker');
                   }
               }

               if (data.type === 'center') {
                    map.setView([data.lat, data.lon], data.zoom || map.getZoom());
               }

               if (data.type === 'fitBounds') {
                   if (data.coords && data.coords.length > 0) {
                       var latlngs = data.coords.map(c => [c.latitude, c.longitude]);
                       var bounds = L.latLngBounds(latlngs);
                       map.fitBounds(bounds, {padding: [50, 50]});
                   }
               }
               
               if (data.type === 'setMarkers') {
                   markerLayer.clearLayers();
                   data.markers.forEach(m => {
                       var color = m.color || 'blue';
                       var iconHtml = '<div style="background-color: '+color+'; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>';
                       var icon = L.divIcon({className: 'custom', html: iconHtml, iconSize: [24,24], iconAnchor: [12,12]});
                       L.marker([m.latitude, m.longitude], {icon: icon}).addTo(markerLayer);
                   });
               }

           } catch(e) { 
               console.log('[Leaflet WebView] Error:', e); 
           }
        }

        // Signal ready
        setTimeout(function() {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({type: 'ready'}));
                console.log('[Leaflet WebView] Sent ready signal');
            }
        }, 100);
      </script>
    </body>
    </html>
    `;

    useImperativeHandle(ref, () => ({
        animateCamera: (options: any) => {
            if (options.center && isReady) {
                webViewRef.current?.injectJavaScript(`
                    handleMessage(JSON.stringify({
                        type: 'center',
                        lat: ${options.center.latitude},
                        lon: ${options.center.longitude},
                        zoom: ${options.zoom || 16}
                    }));
                `);
            }
        },
        fitToCoordinates: (coords: any[], options: any) => {
            if (isReady) {
                webViewRef.current?.injectJavaScript(`
                    handleMessage(JSON.stringify({
                        type: 'fitBounds',
                        coords: ${JSON.stringify(coords)}
                    }));
                `);
            }
        }
    }));

    // Sync Route
    useEffect(() => {
        if (webViewRef.current && isReady) {
            webViewRef.current.injectJavaScript(`
                handleMessage(JSON.stringify({
                    type: 'updatePath',
                    coords: ${JSON.stringify(routeCoordinates)},
                    follow: ${isTracking}
                }));
            `);
        }
    }, [routeCoordinates, isTracking, isReady]);

    // Sync User Location
    useEffect(() => {
        console.log('[LeafletMap] Location update:', location, 'isReady:', isReady);
        if (webViewRef.current && location && isReady) {
            console.log('[LeafletMap] Injecting setUserLocation');
            webViewRef.current.injectJavaScript(`
                handleMessage(JSON.stringify({
                    type: 'setUserLocation',
                    lat: ${location.latitude},
                    lon: ${location.longitude}
                }));
            `);
        }
    }, [location, isReady]);

    // Sync Markers
    useEffect(() => {
        if (webViewRef.current && markers.length > 0 && isReady) {
            webViewRef.current.injectJavaScript(`
                handleMessage(JSON.stringify({
                    type: 'setMarkers',
                    markers: ${JSON.stringify(markers)}
                }));
            `);
        }
    }, [markers, isReady]);

    const handleWebViewMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'ready') {
                console.log('[LeafletMap] WebView is ready!');
                setIsReady(true);
            }
        } catch (e) {
            console.log('[LeafletMap] Error parsing message:', e);
        }
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={{ flex: 1, backgroundColor: '#121212' }}
                scrollEnabled={interactive}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
            />
        </View>
    );
});

export default LeafletMap;
