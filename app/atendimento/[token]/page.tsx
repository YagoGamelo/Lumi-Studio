import CustomerChat from "./customer-chat";
export const dynamic="force-dynamic";
export const metadata={title:"Atendimento | LUMI"};
export default async function CustomerSupport({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 return <CustomerChat token={token}/>;
}
