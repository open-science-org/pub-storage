import React from "react";
import PropTypes from "prop-types";
import IPFS from "ipfs";
import classes from "./IdeaForm.module.css";
import Dropzone from "react-dropzone-uploader";
const wrtc = require("wrtc"); // or require('electron-webrtc')()
const WStar = require("libp2p-webrtc-star");
const wstar = new WStar({ wrtc });
const OrbitDB = require("orbit-db");

const PUBLIC_GATEWAY = "https://ipfs.io/ipfs";

class IdeaForm extends React.Component {
  constructor(props, context) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.uploadIdeaToIPFS = this.uploadIdeaToIPFS.bind(this);
    this.publishFileHash = this.publishFileHash.bind(this);
    //browser node setup
    this.ipfsNode = new IPFS({
      EXPERIMENTAL: { pubsub: true },
      relay: { enabled: true, hop: { enabled: false } },
      config: {
        Addresses: {
          Swarm: [
            "/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star"
          ]
        },
        libp2p: {
          modules: {
            transport: [wstar],
            peerDiscovery: [wstar.discovery]
          }
        }
      }
    });

    this.state = {
      ipfsOptions: {
        id: null,
        version: null,
        protocol_version: null
      },
      value: "",
      added_file_hash: "",
      added_file_contents: ""
    };
  }

  componentDidMount() {
    this.ipfsNode.on("error", e => console.log(e));
    this.ipfsNode.on("ready", async () => {
      this.ipfsNode.id((err, res) => {
        if (err) {
          throw err;
        }
        console.log("Node ID");
        console.log(res);
        this.setState({
          ipfsOptions: {
            id: res.id,
            version: res.agentVersion,
            protocol_version: res.protocolVersion
          }
        });
      });
    });
  }

  // called every time a file's `status` changes
  handleChangeStatus = ({ meta, file }, status) => {
    console.log(status, meta, file);
  };

  // receives array of files that are done uploading when submit button is clicked
  handleSubmit = files => {
    files.map(file => {
      const reader = new window.FileReader();
      reader.readAsArrayBuffer(file.file);
      reader.onloadend = () => {
        /* this.saveToIpfs(Buffer(reader.result)); */
        /* You must use file.file to get the blob  */
        this.uploadIdeaToIPFS(Buffer(reader.result));
      };
    });
  };

  uploadIdeaToIPFS(file) {
    console.log("inside uploadIdeaToIPFS...");
    this.ipfsNode.add(file, (err, filesAdded) => {
      if (err) {
        throw err;
      }

      const hash = filesAdded[0].hash;
      this.setState(
        {
          added_file_hash: hash
        },
        () => {
          this.publishFileHash();
        }
      );
    });
  }

  async publishFileHash() {
    //setup DB
    const orbitdb = await OrbitDB.createInstance(this.ipfsNode);
    const db = await orbitdb.keyvalue("oso-database");
    await db.load();
    console.log("get gon");
    const killua = db.get("gon");
    console.log(killua);
    console.log("DB ONLINE");
    console.log(db.address.toString());
    console.log("DB PUT starting...");
    await db.put("gon", "killua");
    console.log("DB PUT completed!");
    await db.load();
    const value = db.get(this.context.web3.network);
    console.log("Fetched value:");
    console.log(value);

    const addr =
      "/ip4/127.0.0.1/tcp/9000/ws/ipfs/QmU7VGrHnhhnPnY8HUBWwEN9CCpwTb3WfeVdCjoEne5AUA";

    this.ipfsNode.swarm.connect(addr, err => {
      if (err) {
        throw err;
      }
      const topic = "testing123";
      console.log("FILE HASH IS: ");
      console.log(this.state.added_file_hash);
      const msg = Buffer.from(this.state.added_file_hash);
      console.log(this.ipfsNode);

      this.ipfsNode.pubsub.publish(topic, msg, err => {
        if (err) {
          return console.error(`failed to publish to ${topic}`, err);
        }
        console.log(`published to ${topic}`);
      });
    });
  }

  getValidationState() {
    const length = this.state.value.length;
    if (length > 10) return "success";
    else if (length > 5) return "warning";
    else if (length > 0) return "error";
    return null;
  }

  handleChange(e) {
    this.setState({ value: e.target.value });
  }

  /**
   * web3Context = {
   *   accounts: {Array<string>} - All accounts
   *   selectedAccount: {string} - Default ETH account address (coinbase)
   *   network: {string} - One of 'MAINNET', 'ROPSTEN', or 'UNKNOWN'
   *   networkId: {string} - The network ID (e.g. '1' for main net)
   * }
   */

  render() {
    return (
      <div className={classes.UploadContainer}>
        <div className={classes.InfoBox}>
          <h1>Connected to ethereum and ipfs network!</h1>
          <p>Ethereum network: {this.context.web3.network}</p>
          <p>
            Your IPFS version is{" "}
            <strong>{this.state.ipfsOptions.version}</strong>
          </p>
          <p>
            Your IPFS protocol version is{" "}
            <strong>{this.state.ipfsOptions.protocol_version}</strong>
          </p>
          <hr />
          <p>
            Using your ethereum account: {this.context.web3.selectedAccount}
          </p>
          <p>
            Your IPFS ID is <strong>{this.state.ipfsOptions.id}</strong>
          </p>
          <hr />
          <p>Submitted Idea's IPFS hash: {this.state.added_file_hash}</p>
          <p>Submitted Idea's content: {this.state.added_file_contents}</p>
          <p>
            Checkout the uploaded idea at: {PUBLIC_GATEWAY}/
            {this.state.added_file_hash}
          </p>
          <hr />
        </div>
        <div className={classes.Upload}>
          <Dropzone
            styles={{
              dropzone: {
                overflow: "hidden",
                borderStyle: "none"
              }
            }}
            getUploadParams={this.getUploadParams}
            onChangeStatus={this.handleChangeStatus}
            onSubmit={this.handleSubmit}
            accept="image/*,audio/*,video/*"
          />
          <div className={classes.Square} />
        </div>
      </div>
    );
  }
}

IdeaForm.contextTypes = {
  web3: PropTypes.object
};

export default IdeaForm;
