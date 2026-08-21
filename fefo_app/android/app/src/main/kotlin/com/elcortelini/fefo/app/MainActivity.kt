package com.elcortelini.fefo.app

import android.content.Context
import android.content.Intent
import android.app.AlarmManager
import android.app.PendingIntent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import androidx.core.content.FileProvider
import java.io.File
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "fefo/wifi"
    private var hotspot: WifiManager.LocalOnlyHotspotReservation? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var pendingAlarmAudio: String? = null

    override fun onResume() {
        super.onResume()
        isInForeground = true
    }

    override fun onPause() {
        isInForeground = false
        super.onPause()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        pendingAlarmAudio = intent.getStringExtra(AlarmCommandReceiver.EXTRA_AUDIO)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "startHotspot" -> startHotspot(result)
                    "stopHotspot" -> { stopHotspot(); result.success(true) }
                    "connect" -> connect(call.argument<String>("ssid") ?: "",
                        call.argument<String>("password") ?: "", result)
                    "installApk" -> installApk(call.argument<String>("path") ?: "", result)
                    "disconnect" -> { disconnect(); result.success(true) }
                    "getPendingAlarm" -> {
                        val audio = pendingAlarmAudio
                        pendingAlarmAudio = null
                        result.success(audio)
                    }
                    "scheduleAlarmCommand" -> scheduleAlarmCommand(
                        call.argument<Int>("id") ?: 0,
                        call.argument<Long>("atMillis") ?: 0L,
                        call.argument<String>("audio") ?: "",
                        result,
                    )
                    "cancelAlarmCommand" -> cancelAlarmCommand(
                        call.argument<Int>("id") ?: 0,
                        result,
                    )
                    else -> result.notImplemented()
                }
            }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.action == AlarmCommandReceiver.ACTION_ALARM_COMMAND) {
            pendingAlarmAudio = intent.getStringExtra(AlarmCommandReceiver.EXTRA_AUDIO)
        }
    }

    private fun scheduleAlarmCommand(id: Int, atMillis: Long, audio: String, result: MethodChannel.Result) {
        try {
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(this, AlarmCommandReceiver::class.java).apply {
                putExtra(AlarmCommandReceiver.EXTRA_AUDIO, audio)
            }
            val pending = PendingIntent.getBroadcast(
                this,
                AlarmCommandReceiver.requestCode(id),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pending)
            result.success(true)
        } catch (error: Exception) {
            result.error("ALARM_COMMAND_FAILED", error.message, null)
        }
    }

    private fun cancelAlarmCommand(id: Int, result: MethodChannel.Result) {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, AlarmCommandReceiver::class.java)
        val pending = PendingIntent.getBroadcast(
            this,
            AlarmCommandReceiver.requestCode(id),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarmManager.cancel(pending)
        pending.cancel()
        result.success(true)
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
            .addCapability(NetworkCapabilities.NET_CAPABILITY_NOT_RESTRICTED)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_TRUSTED)
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
        manager.requestNetwork(request, networkCallback!!, 60000)
    }

    private fun disconnect() {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        manager.bindProcessToNetwork(null)
        networkCallback?.let { try { manager.unregisterNetworkCallback(it) } catch (_: Exception) {} }
        networkCallback = null
    }

    companion object {
        @JvmStatic
        var isInForeground: Boolean = false
    }

    private fun installApk(path: String, result: MethodChannel.Result) {
        try {
            val apk = File(path)
            if (!apk.isFile) {
                result.error("APK_NOT_FOUND", "APK temporário não encontrado.", null)
                return
            }
            val uri = FileProvider.getUriForFile(this, "com.elcortelini.fefo.app.fileprovider", apk)
            val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(intent)
            result.success(true)
        } catch (error: Exception) {
            result.error("APK_INSTALL_FAILED", error.message, null)
        }
    }
}
