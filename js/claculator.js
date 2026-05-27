import {isEven , majzoor , isNumeric} from "./mymodule.js";

const no1=document.querySelector('#no1');
const no2=document.querySelector('#no2');
const amalgar=document.querySelector('#amalgar');
const result=document.querySelector('#result');
const btncalc=document.querySelector('#btncalc');

btncalc.onclick=(e)=>{
    e.preventDefault();
    try{
        let no1_value=parseFloat(no1.value);
        let no2_value=parseFloat(no2.value);
        let operation=amalgar.value;
        
        switch(operation){
            case 'جمع':
                result.value=no1_value + no2_value;
                break;
            case 'تفریق':
                result.value=no1_value - no2_value;
                break;
            case 'ضرب':
                result.value=no1_value * no2_value;
                break;
            case 'تقسیم':
                if(no2_value !== 0){
                    result.value=no1_value / no2_value;
                } else {
                    result.value='خطا: تقسیم بر صفر';
                }
                break;
            case 'مجذور':
                result.value=majzoor(no1_value);
                break;
            case 'تست زوج بودن':
                result.value=isEven(no1_value);
                break;
            default:
                result.value='عملیات نامعتبر';
        }
    }
    catch(error){
        result.value='خطا در محاسبه';
    }
}
