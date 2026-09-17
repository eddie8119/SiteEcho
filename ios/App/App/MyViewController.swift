import Capacitor

class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()

        let plugin = AppleStoreKitPlugin()
        bridge?.registerPluginInstance(plugin)

        // Manually call setup after registration
        plugin.setupTransactionUpdatesListener()
    }
}
