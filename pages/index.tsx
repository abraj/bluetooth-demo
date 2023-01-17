import Head from 'next/head'
import { useState } from 'react';
import serviceListJson from '../data/gatt-services-list.json';
import characteristicListJson from '../data/gatt-characteristics-list.json';
import styles from '../styles/Home.module.css'

// https://btprodspecificationrefs.blob.core.windows.net/assigned-numbers/Assigned%20Number%20Types/Assigned%20Numbers.pdf
// https://googlechrome.github.io/samples/web-bluetooth/device-information-characteristics.html

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
const characteristicListMap = new Map<string, CharacteristicItem>();

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
  });  
};

const getShortHexCode = (uuid: number | string) => {
  let hexCode;
  if (typeof uuid === 'number') {
    hexCode = `0x${uuid.toString(16).toUpperCase()}`;
  } else if (uuid.length > 6) {
    hexCode = `0x${uuid.substring(4, 8).toUpperCase()}`;
  } else {
    hexCode = uuid;
  }
  return hexCode;
};

const getServiceName = (serviceUuid: number | string) => {
  if (!serviceListMap.size) {
    return 'Unloaded service..';
  }
  const serviceHexCode = getShortHexCode(serviceUuid);
  return serviceListMap.get(serviceHexCode)?.name || 'Unknown service';
};

const getCharacteristicName = (characteristicUuid: number | string) => {
  if (!characteristicListMap.size) {
    return 'Unloaded characteristic..';
  }
  const characteristicHexCode = getShortHexCode(characteristicUuid);
  return characteristicListMap.get(characteristicHexCode)?.name || 'Unknown characteristic';
};

let decoder = new TextDecoder('utf-8');
initServiceListMap();

const startScan = async (setLogs: Function, setElogs: Function) => {
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
    const value = await characteristic.readValue();
    const text = decoder.decode(value);
    printLog(name, text);
  };

  if (!('bluetooth' in navigator)) {
    printError('Bluetooth not supported!', true);
    return;
  }
  
  try {
    // const status = await navigator.bluetooth.getAvailability();
    // printLog('status', status);
  
    // window.addEventListener("availabilitychanged", (event) => {});

    // const serviceUuid = 0x180A;
    const serviceUuid = '0000180a-0000-1000-8000-00805f9b34fb';
    // const serviceUuid = 'device_information';

    const devicePr = navigator.bluetooth.requestDevice({
      // acceptAllDevices: true,
      filters: [{
        namePrefix: 'MacBook',
        // manufacturerData: [{
        //   companyIdentifier: 0x00e0,
        //   dataPrefix: new Uint8Array([0x01, 0x02])
        // }],
        // services: ['0000180a-0000-1000-8000-00805f9b34fb'],
      }],
      optionalServices: [serviceUuid],
    });
    if (!characteristicListMap.size) {
      printLog('INFO', 'Loading characteristics..');
      initCharacteristicListMap();
    }
    const device = await devicePr;
    
    printLog('device.name', device.name);
    printLog('device.id', device.id);

    if (!device.gatt) {
      printError('Bluetooth GATT Server not found!');
      return;
    }
    printLog('device.connected', device.gatt.connected);

    const server = await device.gatt.connect();
    if (!server) {
      printError('Bluetooth GATT Server not found! [2]');
      return;
    }

    if (!device.gatt.connected) {
      printError('Unable to connect to Bluetooth GATT Server!');
      return;
    }
    printLog('device.connected', server.connected);
    printLog('------', '------');

    const service = await server.getPrimaryService(serviceUuid);
    // const service = await server.getPrimaryService('battery_service');

    if (!service) {
      printError(`Bluetooth GATT Service not found: ${getShortHexCode(serviceUuid)}`);
      return;
    }
    printLog('service.name', getServiceName(serviceUuid));

    const chars = await service.getCharacteristics();
    printLog('characteristics.count', chars.length);

    await printCharacteristic(chars[0]);
    await printCharacteristic(chars[1]);

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
  } catch (err: any) {
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
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <h2>Bluetooth Demo - v9.2</h2>
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
