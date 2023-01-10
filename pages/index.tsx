import Head from 'next/head'
import { useState } from 'react';
import serviceListJson from '../data/gatt-services-list.json';
import characteristicListJson from '../data/gatt-characteristics-list.json';
import styles from '../styles/Home.module.css'

// https://btprodspecificationrefs.blob.core.windows.net/assigned-numbers/Assigned%20Number%20Types/Assigned%20Numbers.pdf
// https://googlechrome.github.io/samples/web-bluetooth/device-information-characteristics.html
// https://developer.chrome.com/articles/bluetooth/

// https://gist.github.com/sam016/4abe921b5a9ee27f67b3686910293026
// https://gist.githubusercontent.com/sam016/4abe921b5a9ee27f67b3686910293026/raw/d3d8fb7fca459b9af757f6e4e4e0f1863a646b40/gatt-services-list.json
// https://gist.githubusercontent.com/sam016/4abe921b5a9ee27f67b3686910293026/raw/d3d8fb7fca459b9af757f6e4e4e0f1863a646b40/gatt-characteristics-list.json
// https://gist.githubusercontent.com/sam016/4abe921b5a9ee27f67b3686910293026/raw/d3d8fb7fca459b9af757f6e4e4e0f1863a646b40/gatt-descriptors-list.json

interface DataItem {
  id: string;
  short_id: string;
  name: string;
  code: string;
}
type ServiceItem = DataItem;
type CharacteristicItem = DataItem;

const serviceListMap = new Map<string, ServiceItem>();
const serviceListMap2 = new Map<string, ServiceItem>();
const characteristicListMap = new Map<string, CharacteristicItem>();
const characteristicListMap2 = new Map<string, CharacteristicItem>();

const initServiceListError: string[] = [];
const initCharacteristicListError: string[] = [];

const initServiceListMap = () => {
  serviceListJson.forEach(service => {
    const short_id = service.id.substring(service.id.lastIndexOf('.') + 1);
    const serviceItem: ServiceItem = {
      id: service.id,
      short_id,
      name: service.name,
      code: service.code,
    }

    serviceListMap.set(service.code, serviceItem);
    if (serviceListMap2.get(short_id)) {
      initServiceListError.push(`service name conflict: ${short_id}`);
    } else {
      serviceListMap2.set(short_id, serviceItem);  
    }
  });  
};

const initCharacteristicListMap = () => {
  characteristicListJson.forEach(characteristic => {
    const short_id = characteristic.id.substring(characteristic.id.lastIndexOf('.') + 1);
    const characteristicItem: CharacteristicItem = {
      id: characteristic.id,
      short_id,
      name: characteristic.name,
      code: characteristic.code,
    }

    characteristicListMap.set(characteristic.code, characteristicItem);
    if (characteristicListMap2.get(short_id)) {
      initCharacteristicListError.push(`characteristic name conflict: ${short_id}`);
    } else {
      characteristicListMap2.set(short_id, characteristicItem);  
    }
  });  
};

const getShortHexCode = (uuid: number | string) => {
  const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
  let hexCode;
  if (typeof uuid === 'number') {
    hexCode = `0x${uuid.toString(16).toUpperCase()}`;
  } else if (uuid.length === 32 + 4 && regexExp.test(uuid)) {  // uuid
    hexCode = `0x${uuid.substring(4, 8).toUpperCase()}`;
  } else {
    hexCode = uuid;
  }
  return hexCode;
};

// const getServiceItem = (serviceId: number | string) => {
//   if (!serviceListMap.size) {
//     return null;
//   }
//   let serviceHexCode = getShortHexCode(serviceId);
//   if (serviceHexCode && !serviceHexCode.startsWith('0x')) {
//     serviceHexCode = serviceListMap2.get(serviceId as string)?.code || '';
//   }
//   return serviceListMap.get(serviceHexCode) || null;
// };

const getServiceName = (serviceId: number | string) => {
  if (!serviceListMap.size) {
    return 'Unloaded service..';
  }
  let serviceHexCode = getShortHexCode(serviceId);
  if (serviceHexCode && !serviceHexCode.startsWith('0x')) {
    serviceHexCode = serviceListMap2.get(serviceId as string)?.code || '';
  }
  return serviceListMap.get(serviceHexCode)?.name || 'Unknown service';
};

// const getCharacteristicItem = (characteristicUuid: number | string) => {
//   if (!characteristicListMap.size) {
//     return null;
//   }
//   const characteristicHexCode = getShortHexCode(characteristicUuid);
//   return characteristicListMap.get(characteristicHexCode) || null;
// };

const getCharacteristicName = (characteristicUuid: number | string) => {
  if (!characteristicListMap.size) {
    return 'Unloaded characteristic..';
  }
  const characteristicHexCode = getShortHexCode(characteristicUuid);
  return characteristicListMap.get(characteristicHexCode)?.name || 'Unknown characteristic';
};

let decoder = new TextDecoder('utf-8');
let serverConnected = false;
initServiceListMap();

const startScan = async (setLogs: Function, setElogs: Function) => {
  serverConnected = false;
  setLogs([]);
  setElogs([]);

  const printLog = (name: string, value: string | boolean | number | undefined) => {
    if (value === undefined || value === null) value = '';
    const msg = `${name}: ${value.toString()}`;
    console.log(msg);
    setLogs((v: string[]) => [...v, msg]);
  };

  const printError = (value: string, isWarn?: boolean) => {
    if (value === undefined || value === null) value = '';
    const name = isWarn ? 'WARN' : 'ERROR';
    const msg = `${name}: ${value.toString()}`;
    (isWarn ? console.warn : console.error)(msg);
    setElogs((v: string[]) => [...v, msg]);
  };

  const printCharacteristic = async (characteristic: BluetoothRemoteGATTCharacteristic) => {
    const name = getCharacteristicName(characteristic.uuid);
    try {
      const value = await characteristic.readValue();
      const text = decoder.decode(value);
      printLog(name, text);
    } catch(e) {
      console.log(`${name}:`);
      console.error(e);      
    }
  };

  if (!('bluetooth' in navigator)) {
    printError('Bluetooth adapter missing! Try enabling experimental flag: chrome://flags/#enable-experimental-web-platform-features', true);
    return;
  }
  
  try {
    const status = await navigator.bluetooth.getAvailability();
    if (!status) {
      printError('This device does not have a Bluetooth adapter!');
      return;
    }

    // NOTE: Bluetooth 'turn on' status cannot be determined using Bluetooth Web API

    const serviceId = 0x180A;  // Device Information
    // const serviceId = '0000180a-0000-1000-8000-00805f9b34fb';  // uuid
    // const serviceId = 'device_information';  // name
    // const serviceId = 'battery_service';  // name

    const devicePr = navigator.bluetooth.requestDevice({
      // acceptAllDevices: true,
      filters: [{
        // namePrefix: 'MacBook',
        manufacturerData: [{
          companyIdentifier: 0x004C,  // Apple
          // companyIdentifier: 0x0059,  // Nordic Semiconductor ASA
          // dataPrefix: new Uint8Array([0x01, 0x02])
        }],
        // services: ['0000180a-0000-1000-8000-00805f9b34fb'],
      }],
      optionalServices: [serviceId],
    });
    if (!characteristicListMap.size) {
      initCharacteristicListMap();
    }
    const device = await devicePr;

    [...initServiceListError, ...initCharacteristicListError].forEach(error => {
      printError(error);
      return;
    });
    
    printLog('device.name', device.name);
    printLog('device.id', device.id);

    if (!device.gatt) {
      printError('Bluetooth GATT Server not found!');
      return;
    }
    printLog('device.connected', device.gatt.connected);

    let server: BluetoothRemoteGATTServer;
    if (!device.gatt.connected) {
      server = await device.gatt.connect();
      if (!server) {
        printError('Bluetooth GATT Server not found! [2]');
        return;
      }
      printLog('device.connected', server.connected);
    } else {
      server = device.gatt;
    }

    if (!server.connected) {
      printError('Unable to connect to Bluetooth GATT Server!');
      return;
    }
    serverConnected = server.connected;
    printLog('------', '------');

    const service = await server.getPrimaryService(serviceId);
    if (!service) {
      printError(`Bluetooth GATT Service not found: ${getShortHexCode(serviceId)}`);
      return;
    }

    printLog('service.name', getServiceName(serviceId));

    const chars = await service.getCharacteristics();
    printLog('characteristics.count', chars.length);

    chars.forEach(async (char) => {
      await printCharacteristic(char);
    });

    // TODO::
    // complete document and send it!
    // study format of uuid: oreilly
    // convert above to promise format
    // support for array of services
    // see all supported macbook services
    // print data in tabular format
    // support for multi-type data .readValue()
    // Suupport for scan using manufacturer Id
    // Support for full same (remove macbook restriction)

    // const plist = chars.map(async (characteristic) => {
    //   const value = await characteristic.readValue();
    //   const data = value.buffer;
    //   return `uuid,value:${characteristic.uuid},${data}`;
    // });

    // const dlist = await Promise.all(plist);
    // dlist.forEach(data => {
    //   console.log(data);
    //   setLogs((v: string[]) => [...v, data]);
    // });

    // const characteristic = await service.getCharacteristic('battery_level');
    // console.log('characteristic:', characteristic);
    // setLogs((v: string[]) => [...v, `${characteristic}`]);

    // window.addEventListener("availabilitychanged", (event) => {});
  } catch (err: any) {
    if (serverConnected && (err as Error).message.includes('connect first')) {
      printError('[Unexpected] Possible bug with the bluetooth implementation in this browser!', true);
    }
    printError(err.toString());
  }  
};

export default function Home() {
  const [logs, setLogs] = useState<string[]>([]);
  const [elogs, setElogs] = useState<string[]>([]);

  const clearLogs = () => setLogs([]);
  const clearElogs = () => setElogs([]);

  return (
    <>
      <Head>
        <title>Bluetooth Demo</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.flagBanner}>
        <a href='chrome://flags/#enable-experimental-web-platform-features' target="_blank" rel="noreferrer">Flags</a>
      </div>
      <main className={styles.main}>
        <h2>Bluetooth Demo - v9.21</h2>
        <div className={styles.section}>
          <button onClick={() => startScan(setLogs, setElogs)}>Start Scan</button>
        </div>
        <div>
          <h3>Logs:</h3>
          {logs.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
          <button onClick={clearLogs}>Clear</button>
        </div>
        <div>
          <h3>Error:</h3>
          {elogs.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
          <button onClick={clearElogs}>Clear</button>
        </div>
      </main>
    </>
  )
}
