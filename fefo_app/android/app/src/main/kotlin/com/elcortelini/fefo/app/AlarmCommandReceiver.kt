package com.elcortelini.fefo.app

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmCommandReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val audio = intent.getStringExtra(EXTRA_AUDIO) ?: return
        // Com o app aberto, o motor Flutter já trata o disparo. Reabrir a
        // Activity durante uma tela ativa pode derrubar a tarefa no Android.
        if (MainActivity.isInForeground) return
        val launch = Intent(context, MainActivity::class.java).apply {
            action = ACTION_ALARM_COMMAND
            putExtra(EXTRA_AUDIO, audio)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        context.startActivity(launch)
    }

    companion object {
        const val ACTION_ALARM_COMMAND = "com.elcortelini.fefo.app.ALARM_COMMAND"
        const val EXTRA_AUDIO = "fefo_alarm_audio"

        fun requestCode(id: Int): Int = id + 200000
    }
}
