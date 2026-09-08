export const asMinor=(value)=>{const [whole,fraction='']=String(value).split('.');return BigInt(whole)*100n+BigInt((fraction+'00').slice(0,2));};
export const fromMinor=(value)=>String(value/100n)+'.'+String(value%100n).padStart(2,'0');
export const outstanding=(agreed,payments)=>{const total=payments.reduce((sum,p)=>sum+asMinor(p),asMinor(agreed));return fromMinor(total<0n?0n:total);};
export const collectionStatus=(due,paid)=>{if(paid===null||paid===undefined)return 'NOT_ENTERED';const remainder=asMinor(due)-asMinor(paid);return remainder<=0n?'PAID':asMinor(paid)===0n?'PENDING':'PARTIAL';};
