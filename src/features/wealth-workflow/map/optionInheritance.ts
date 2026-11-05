/** A edits flow to untouched B/C values. Existing differences and quote evidence stay local. */
export function editQuoteOption(options:Record<string,any>[], index:number, key:string, value:any) {
  const previous=options[0]?.[key];
  return options.map((option,i)=>{
    if(i===index) return {...option,[key]:value,...(index>0?{_optionOverrides:{...option._optionOverrides,[key]:true}}:{})};
    if(index!==0||i===0||key.startsWith('_quote')||option._optionOverrides?.[key]) return option;
    const current=option[key];
    if(current!==undefined&&current!==''&&JSON.stringify(current)!==JSON.stringify(previous)) return option;
    return {...option,[key]:value};
  });
}
