package com.maldives.cargo;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String apkUrl = call.getString("url");
        String fileName = call.getString("fileName");
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("Missing APK URL.");
            return;
        }
        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "maldives-cargo-update.apk";
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settingsIntent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
            );
            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settingsIntent);

            JSObject result = new JSObject();
            result.put("openedSettings", true);
            call.resolve(result);
            return;
        }

        String safeFileName = fileName.replaceAll("[^A-Za-z0-9._-]", "-");
        new Thread(() -> {
            try {
                File apkFile = downloadApk(apkUrl, safeFileName);
                Uri apkUri = FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName() + ".fileprovider",
                        apkFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getContext().startActivity(installIntent);

                JSObject result = new JSObject();
                result.put("openedSettings", false);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Unable to install update.", error);
            }
        }).start();
    }

    private File downloadApk(String apkUrl, String fileName) throws Exception {
        URL url = new URL(apkUrl);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.connect();

        int responseCode = connection.getResponseCode();
        if (responseCode < 200 || responseCode >= 300) {
            throw new IllegalStateException("APK download failed: HTTP " + responseCode);
        }

        File apkFile = new File(getContext().getCacheDir(), fileName);
        try (InputStream input = connection.getInputStream();
             FileOutputStream output = new FileOutputStream(apkFile, false)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = input.read(buffer)) != -1) {
                output.write(buffer, 0, bytesRead);
            }
        } finally {
            connection.disconnect();
        }
        return apkFile;
    }
}
