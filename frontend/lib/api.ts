const base=process.env.NEXT_PUBLIC_API_URL??"http://localhost:8000/api";
export function token(){return typeof window==="undefined"?null:localStorage.getItem("sf_access")}
export function setTokens(access:string,refresh:string){localStorage.setItem("sf_access",access);localStorage.setItem("sf_refresh",refresh)}
export function logout(){localStorage.removeItem("sf_access");localStorage.removeItem("sf_refresh")}
export async function api<T>(path:string, init:RequestInit={}):Promise<T>{
 const headers=new Headers(init.headers);headers.set("Content-Type","application/json");const current=token();if(current)headers.set("Authorization",`Bearer ${current}`);
 let res=await fetch(`${base}${path}`,{...init,headers});
 if(res.status===401&&localStorage.getItem("sf_refresh")){const renewal=await fetch(`${base}/auth/token/refresh/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh:localStorage.getItem("sf_refresh")})});if(renewal.ok){const {access}=await renewal.json();localStorage.setItem("sf_access",access);headers.set("Authorization",`Bearer ${access}`);res=await fetch(`${base}${path}`,{...init,headers})}}
 if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(typeof body.detail==="string"?body.detail:JSON.stringify(body))} return res.status===204?undefined as T:res.json();
}
