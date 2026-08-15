package com.elcortelini.fefo.app

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "fefo/wifi"
    private var hotspot: WifiManager.LocalOnlyHotspotReservation? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "startHotspot" -> startHotspot(result)
                    "stopHotspot" -> { stopHotspot(); result.success(true) }
                    "connect" -> connect(call.argument<String>("ssid") ?: "",
                        call.argument<String>("password") ?: "", result)
                    "disconnect" -> { disconnect(); result.success(true) }
                    else -> result.notImplemented()
                }
            }
    }

    private fun startHotspot(result: MethodChannel.Result) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            result.error("ANDROID_VERSION", "O hotspot automatico requer Android 8 ou superior.", null)
            return
        }
        stopHotspot()
        val wifi = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        wifi.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
            override fun onStarted(reservation: WifiManager.LocalOnlyHotspotReservation) {
                hotspot = reservation
                val values = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val config = reservation.softApConfiguration
                    mapOf("ssid" to config.ssid, "password" to config.passphrase,
                        "securityType" to config.securityType)
                } else {
                    @Suppress("DEPRECATION") val config = reservation.wifiConfiguration
                    @Suppress("DEPRECATION") mapOf("ssid" to config?.SSID,
                        "password" to config?.preSharedKey, "securityType" to 1)
                }
                runOnUiThread { result.success(values) }
            }
            override fun onFailed(reason: Int) {
                runOnUiThread { result.error("HOTSPOT_FAILED", "Falha ao criar hotspot local: $reason", null) }
            }
        }, null)
    }

    private fun stopHotspot() {
        hotspot?.close()
        hotspot = null
    }

    private fun connect(ssid: String, password: String, result: MethodChannel.Result) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            result.error("ANDROID_VERSION", "A conexão automática requer Android 10 ou superior.", null)
            return
        }
        disconnect()
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val specifier = WifiNetworkSpecifier.Builder().setSsid(ssid)
            .setWpa2Passphrase(password).build()
        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .setNetworkSpecifier(specifier).build()
        var completed = false
        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                manager.bindProcessToNetwork(network)
                if (!completed) { completed = true; runOnUiThread { result.success(true) } }
            }
            override fun onUnavailable() {
                if (!completed) { completed = true; runOnUiThread {
                    result.error("WIFI_UNAVAILABLE", "Rede FEFO não autorizada ou indisponível.", null)
                } }
            }
        }
        manager.requestNetwork(request, networkCallback!!, 30000)
    }

    private fun disconnect() {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        manager.bindProcessToNetwork(null)
        networkCallback?.let { try { manager.unregisterNetworkCallback(it) } catch (_: Exception) {} }
        networkCallback = null
    }
}
