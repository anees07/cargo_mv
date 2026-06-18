package com.maldives.cargo;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativePrinter")
public class NativePrinterPlugin extends Plugin {
    private static final int DEFAULT_PORT = 9100;
    private static final int CONNECT_TIMEOUT_MS = 5000;
    private static final int READ_TIMEOUT_MS = 10000;

    @PluginMethod
    public void print(PluginCall call) {
        String host = call.getString("host");
        Integer port = call.getInt("port", DEFAULT_PORT);
        String text = call.getString("text");

        if (host == null || host.trim().isEmpty()) {
            call.reject("Missing printer host.");
            return;
        }
        if (port == null || port <= 0 || port > 65535) {
            call.reject("Invalid printer port.");
            return;
        }
        if (text == null || text.trim().isEmpty()) {
            call.reject("Missing print text.");
            return;
        }

        new Thread(() -> {
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress(host.trim(), port), CONNECT_TIMEOUT_MS);
                socket.setSoTimeout(READ_TIMEOUT_MS);

                OutputStream output = socket.getOutputStream();
                output.write(text.getBytes(StandardCharsets.UTF_8));
                output.write(new byte[] { 0x0A, 0x0A, 0x0A });
                output.write(new byte[] { 0x1D, 0x56, 0x42, 0x00 });
                output.flush();

                call.resolve();
            } catch (Exception error) {
                call.reject("Unable to print to network printer.", error);
            }
        }).start();
    }
}
