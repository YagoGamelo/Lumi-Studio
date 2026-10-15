import OverlayPlayer from "./overlay-player";
export const dynamic="force-dynamic";
type Search={title?:string;handle?:string;accent?:string;message?:string;scene?:string;key?:string};
export default async function StreamOverlay({searchParams}:{searchParams:Promise<Search>}){
 const params=await searchParams;
 const str=(s:unknown,max:number)=>typeof s==="string"?s.slice(0,max):"";
 return <OverlayPlayer title={str(params.title,90)} handle={str(params.handle,50)} accent={str(params.accent,7)} scene={str(params.scene,50)} message={str(params.message,180)} token={str(params.key,64)}/>;
}
