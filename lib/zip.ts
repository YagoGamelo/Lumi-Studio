/**
 * Minimal ZIP (stored, no compression) for downloadable bot bundles.
 * UTF-8 filenames and data; no third-party package needed.
 */
export function zipFiles(files:{name:string;content:string}[]):Buffer{
 const parts:Buffer[]=[];
 const central:Buffer[]=[];
 let offset=0;
 for(const file of files){
  if(!/^[a-zA-Z0-9._/-]{1,100}$/.test(file.name)||file.name.includes(".."))throw new Error("Invalid bundle filename");
  const name=Buffer.from(file.name,"utf8");
  const data=Buffer.from(file.content,"utf8");
  const checksum=crc32(data);
  const head=Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50,0);
  head.writeUInt16LE(20,4);head.writeUInt16LE(0x0800,6);
  head.writeUInt16LE(0,8); // stored
  head.writeUInt32LE(checksum,14);
  head.writeUInt32LE(data.length,18);
  head.writeUInt32LE(data.length,22);
  head.writeUInt16LE(name.length,26);
  parts.push(head,name,data);
  const record=Buffer.alloc(46);
  record.writeUInt32LE(0x02014b50,0);
  record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);
  record.writeUInt16LE(0x0800,8);
  record.writeUInt16LE(0,10);
  record.writeUInt32LE(checksum,16);
  record.writeUInt32LE(data.length,20);record.writeUInt32LE(data.length,24);
  record.writeUInt16LE(name.length,28);record.writeUInt32LE(offset,42);
  central.push(record,name);
  offset+=head.length+name.length+data.length;
 }
 const centralSize=central.reduce((n,b)=>n+b.length,0);
 const end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);
 end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
 end.writeUInt32LE(centralSize,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...parts,...central,end]);
}
function crc32(data:Buffer){
 let crc=0xffffffff;
 for(const b of data){
  crc^=b;
  for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 return (crc^0xffffffff)>>>0;
}
