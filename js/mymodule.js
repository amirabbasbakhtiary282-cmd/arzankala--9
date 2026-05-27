export function jam(x, y) {
    return x + y;
}

export const tafrigh = (x, y) => {
    return x - y;
}

export const isEven = (x) => {
    if(x % 2 === 0){
        return "عدد زوج است";
    }
    else{
        return "عدد فرد است";
    }
}

export const majzoor = (x) => {
    return x * x;
}

export const isNumeric = (x) => {
    return typeof x === 'number' && !isNaN(x);
}
