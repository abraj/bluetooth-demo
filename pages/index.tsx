import Head from 'next/head'
import { useState } from 'react';
import styles from '../styles/Home.module.css'

const startScan = async (setLogs: Function, setElogs: Function) => {
  if ('bluetooth' in navigator) {
    try {
      const status = await navigator.bluetooth.getAvailability();
      console.log('status:', status);
      setLogs((v: string[]) => [...v, `${status}`]);

      window.addEventListener("availabilitychanged", (event) => {
        console.log('event:', event);
        setLogs((v: string[]) => [...v, `${event}`]);
      });

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        // filters: [{
          // name: 'MacBook Pro',
          // namePrefix: 'MacBook',
          // services: ['battery_service'],
          // services: ['heart_rate'],
          // services: [0xaf84],
          // services: ['0000180a-0000-1000-8000-00805f9b34fb'],
          // services: [0x1234, 0x12345678, '99999999-0000-1000-8000-00805f9b34fb'],
          // manufacturerData: [{
          //   companyIdentifier: 0x00e0,
          //   dataPrefix: new Uint8Array([0x01, 0x02])
          // }],
        // }],
        optionalServices: ['0000180a-0000-1000-8000-00805f9b34fb'],
        // optionalServices: [0xaf84, 'battery_service', 'heart_rate', '00001108-0000-1000-8000-00805f9b34fb'],
        // optionalServices: [0xaf84],
        // optionalServices: ['battery_service'], // Required to access service later.
        // optionalServices: ['heart_rate'], // Required to access service later.
      });
      console.log('device:', device);
      setLogs((v: string[]) => [...v, `${device}`]);
      console.log('device:', JSON.stringify(device));
      setLogs((v: string[]) => [...v, JSON.stringify(device)]);

      // Human-readable name of the device.
      console.log(device.name);
      setLogs((v: string[]) => [...v, `${device.name}`]);

      // Attempts to connect to remote GATT Server.
      console.log(`A: ${device.gatt?.connected}`);
      setLogs((v: string[]) => [...v, `A: ${device.gatt?.connected}`]);
      const server = await device.gatt?.connect();
      console.log(`B: ${device.gatt?.connected}`);
      setLogs((v: string[]) => [...v, `B: ${device.gatt?.connected}`]);

      if (server) {
        console.log(`C: ${server.connected}`);
        setLogs((v: string[]) => [...v, `C: ${server.connected}`]);

        // server.getPrimaryService(0xaf84).then(service => {
        //   console.log('0xaf84:', service);
        //   setLogs((v: string[]) => [...v, `0xaf84: ${service}`]);
        // }).catch(err => {
        //   console.error('[0xaf84:error]', err);
        //   setElogs((v: string[]) => [...v, '0xaf84:error:' + err.toString()]);    
        // });

        // server.getPrimaryService('battery_service').then(service => {
        //   console.log('battery_service:', service);
        //   setLogs((v: string[]) => [...v, `battery_service: ${service}`]);
        // }).catch(err => {
        //   console.error('[battery_service:error]', err);
        //   setElogs((v: string[]) => [...v, 'battery_service:error:' + err.toString()]);    
        // });

        // server.getPrimaryService('heart_rate').then(service => {
        //   console.log('heart_rate:', service);
        //   setLogs((v: string[]) => [...v, `heart_rate: ${service}`]);
        // }).catch(err => {
        //   console.error('[heart_rate:error]', err);
        //   setElogs((v: string[]) => [...v, 'heart_rate:error:' + err.toString()]);    
        // });

        // server.getPrimaryService('0000180a-0000-1000-8000-00805f9b34fb').then(service => {
        //   console.log('5f9b34fb:', service);
        //   setLogs((v: string[]) => [...v, `5f9b34fb: ${service}`]);
        // }).catch(err => {
        //   console.error('[5f9b34fb:error]', err);
        //   setElogs((v: string[]) => [...v, '5f9b34fb:error:' + err.toString()]);    
        // });

        const service = await server.getPrimaryService('0000180a-0000-1000-8000-00805f9b34fb');
        // const service = await device.gatt?.getPrimaryService('battery_service');
        // const service = await device.gatt?.getPrimaryService('heart_rate');
        // const service = await server.getPrimaryService('battery_service');

        console.log('service:', service);
        setLogs((v: string[]) => [...v, `service:${service}`]);

        if (service) {
          const chars = await service.getCharacteristics();
          console.log('chars:', chars);
          setLogs((v: string[]) => [...v, `chars:${service}`]);  
        }

        // const service = await server.getPrimaryService('battery_service');
        // console.log('service:', service);
        // setLogs((v: string[]) => [...v, `${service}`]);

        // console.log(`D: ${device.gatt?.connected}`);
        // setLogs((v: string[]) => [...v, `D: ${device.gatt?.connected}`]);
  
        // const characteristic = await service.getCharacteristic('battery_level');
        // console.log('characteristic:', characteristic);
        // setLogs((v: string[]) => [...v, `${characteristic}`]);

        // const batteryLevel = await characteristic.readValue();
        // console.log('batteryLevel:', batteryLevel);
        // setLogs((v: string[]) => [...v, `${batteryLevel}`]);

        // console.log('DONE!');
        // setLogs((v: string[]) => [...v, 'DONE!']);

        // server.getPrimaryService()

        // const xx = await device.gatt?.getPrimaryServices('4hhrN3cyNCPf/LO+VNu1ww==');
        // console.log('>>', xx);
      }

      // ...
    } catch (err: any) {
      console.error('[error]', err);
      setElogs((v: string[]) => [...v, err.toString()]);
    }
  } else {
    console.warn('Bluetooth not supported!');
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
        <h2>Bluetooth Demo - v7.8</h2>
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
