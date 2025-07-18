import {Injectable, OnInit} from '@angular/core';
import * as _ from 'lodash-es';
import {InputText} from '../../helpers/form/input-text';
import {RadioButtons} from '../../helpers/form/radio-buttons';
import {Checkbox} from '../../helpers/form/checkboxes';
import {ArrayElement} from '../../helpers/form/array-element';
import {DropdownList} from '../../helpers/form/dropdown-list';
import {InputNumber} from '../../helpers/form/input-number';
import {WindowRefService} from "../../helpers/window-ref.service";
import {AppService} from "../../app.service";
import {Observable, of} from "rxjs";
import {AeListService} from "../ae-list/ae-list.service";
import {Hl7ApplicationsService} from "../hl7-applications/hl7-applications.service";
import {Globalvar} from "../../constants/globalvar";
import {j4care} from "../../helpers/j4care.service";
import {J4careHttpService} from "../../helpers/j4care-http.service";
import {OrderByPipe} from "../../pipes/order-by.pipe";
import {DevicesService} from "../devices/devices.service";
import {WebAppsListService} from "../web-apps-list/web-apps-list.service";
import {LocalLanguageObject} from "../../interfaces";
import {map, switchMap} from "rxjs/operators";
import {ControlService} from "../control/control.service";

@Injectable()
export class DeviceConfiguratorService{
    getFormaterValue = {};
    device;
    schema;
    breadcrumbs = [];
    allOptions = {};
    defaultOpenBlock:string = "ext"; //possible values'attr'|'child'|'ext'
    constructor(
        private $http:J4careHttpService,
        private mainservice:AppService,
        private deviceService:DevicesService,
        private aeListService:AeListService,
        private hl7service:Hl7ApplicationsService,
        private webAppListService:WebAppsListService,
        private controlService:ControlService
    ) {
        this.breadcrumbs = [
            {
                url: '/device/devicelist',
                title: $localize `:@@devicelist:devicelist`,
                devicereff: undefined
            }
        ];
        _.forEach(Globalvar.DYNAMIC_FORMATER,(m,i)=>{
            if(m.pathInDevice){
                this.getFormaterValue[i] = {};
                this.getFormaterValue[i] = (device)=>{
                    if(_.hasIn(device,m.pathInDevice) && _.get(device,m.pathInDevice)){
                        if(i === "dcmArchiveAETitle"){
                            return of(j4care.extendAetObjectWithAliasFromSameObject(_.get(device,m.pathInDevice)));
                        }else{
                            return of(_.get(device,m.pathInDevice));
                        }
                    }else{
                        return of([]);
                    }
                }
            }else{
                switch (i) {
/*                    case 'webApp':
                        this.getFormaterValue['webApp'] = {};
                        this.getFormaterValue['webApp'] = (device)=>{
                            if(_.hasIn(this.mainservice.global,'webApp')){
                                return of(this.mainservice.global.webApp);
                            }else{
                                return this.webAppListService.getWebApps();
                            }
                        };
                        break;*/
                    case 'dcmAETitle':
                        this.getFormaterValue['dcmAETitle'] = {};
                        this.getFormaterValue['dcmAETitle'] = (device)=>{
                            if(_.hasIn(this.mainservice.global,'aes')){
                                return of(this.mainservice.global.aes);
                            }else{
                                return this.aeListService.getAes();
                            }
                        };
                        break;
                    case 'dicomDeviceName':
                        this.getFormaterValue['dicomDeviceName'] = {};
                        this.getFormaterValue['dicomDeviceName'] = (device)=>{
                            if(_.hasIn(this.mainservice.global,'devices')){
                                return of(this.mainservice.global.devices);
                            }else{
                                return this.deviceService.getDevices();
                            }
                        };
                        break;
                    case 'hl7ApplicationName':
                        this.getFormaterValue['hl7ApplicationName'] = {};
                        this.getFormaterValue['hl7ApplicationName'] = (device)=>{
                            if(_.hasIn(this.mainservice.global,'hl7')){
                                return of(this.mainservice.global.hl7);
                            }else{
                                return this.hl7service.getHl7ApplicationsList('');
                            }
                        };
                        break;
                }
            }
        })
    }
    replaceOldAETitleWithTheNew(object, newAeTitle){
        let oldAETitle = object.dicomAETitle;
        j4care.traverse(object,(m,i)=>{
            if(i != "dicomAETitle" && m === oldAETitle){
                m = newAeTitle;
            }
            return m;
        });
    }
    getBreadcrumbTitleFromModel(model, schemaObject){
        let title = 'object';
        if (_.hasIn(schemaObject, 'type') && schemaObject.type === 'array'){
            if (model){
                title = this.replaceCharactersInTitleKey(schemaObject.titleKey, model);
            }else{
                title = '[NEW]';
            }
        }else{
            if (_.hasIn(schemaObject, 'title')){
                title = schemaObject.title;
            }
        }
        return title;
    }
    removePartFromDevice(path){
        if (path){
            try{
                (<Array<any>>_.get(this.device, path.path)).splice(path.index, 1);
                return true;
            }catch (e){
                return false;
            }
        }
        return false;
    }
    isSameSiblingUrl(lastUrl,newUrl){
        try{
            if(lastUrl === newUrl)
                return true;
            let firstMatch;
            let secondMatch;
            const regex = /\/(\S*)\/((\S*)\[(\d*)\])\/(\S*)/;
            if ((firstMatch = regex.exec(lastUrl)) !== null && (secondMatch = regex.exec(newUrl)) !== null) {
                if(firstMatch[1] === secondMatch[1] && firstMatch[3] === secondMatch[3] && firstMatch[5] === secondMatch[5]){
                    return true
                }
            }
            return false;
        }catch(e: unknown){
            return false;
        }
    }
    getObjectsFromPath(path){
        const regex = /\/(\S*)\/(\S*)\/(\S*)/;
        let m;
        if ((m = regex.exec(path)) !== null) {
           if(m[2] && m[3]){
               return {
                   model:_.get(this.device,m[2]),
                   schemaObject:_.get(this.schema,m[3]),
                   schema:m[3],
                   devicereff:m[2]
               }
           }
        }
        return null;
    }
    getPrefixAndSuffixArray(currentUrl,allArray){
        try{
            if(allArray.length < 2){
             return {
                 prefix:[],
                 suffix:[]
             };
            }else{
                let currentSiblingIndex = _.findIndex(allArray, (p) => {
                    return p['url'] === currentUrl;
                });
                if(allArray.length === 2){
                    if(currentSiblingIndex === 0){
                        return {
                            prefix:[],
                            suffix:allArray.slice(1,2),
                        };
                    }else{
                        return {
                            prefix:allArray.slice(0,1),
                            suffix:[],
                        };
                    }
                }else{
                    if(currentSiblingIndex > -1)
                        return {
                            prefix:allArray.slice(0,currentSiblingIndex),
                            suffix:allArray.slice(currentSiblingIndex+1,allArray.length),
                        };
                    else
                        return {
                            prefix:allArray,
                            suffix:[]
                        }
                }
            }
        }catch(e: unknown){
            return {
                prefix:[],
                suffix:[]
            };
        }

    }
    getMaterialIconNameForBreadcrumbs(deviceReff){
        const regex = /\[\d*\]+$/m;
        if ((regex.exec(deviceReff)) !== null) {
            return 'subdirectory_arrow_right';
        }
        return 'extension';
    }
    removeExtensionFromDevice(devicereff){
        console.log('in service devicereff', devicereff);
        _.unset(this.device, devicereff);
        console.log('this.device', this.device);
    }
    getDevice(devicename:string){
        return this.$http.get(`${j4care.addLastSlash(this.mainservice.baseUrl)}devices/${devicename}`)
    }
    getSchema(schema){
        //const currentSavedLanguage = <LocalLanguageObject> JSON.parse(localStorage.getItem('current_language'));
        let schemaURL = `./assets/schema/` + schema;
        return this.$http.get(schemaURL)
            //.map(res => {let resjson; try{ let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/"); if(pattern.exec(res.url)){ WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";} resjson = res; }catch (e){ resjson = [];} return resjson;});
    };
    getSchemaFromPath(schema, schemaparam){
        let paramArray = schemaparam.split('.');
        let currentschemaposition = _.cloneDeep(schema);
        let parentkey;
        let parentSchema;
        if (_.hasIn(schema, schemaparam)){

            _.forEach(paramArray, (m) => {
                if (!_.hasIn(currentschemaposition, m)){
                    currentschemaposition = null;
                    return null;
                }else{
                    parentkey = m;
                    parentSchema = currentschemaposition;
                    currentschemaposition = currentschemaposition[m];
                }
            });

            return currentschemaposition;
        }else{
            return null;
        }
    };
    addChangesToDevice(value, devicereff,  device?){
        /*
        * Check if the changed part is a child (or in the root)
        * */
        if (devicereff){
            if(device){
                //If the part is already in the device override / call setWith with the child refference otherwise use lodash-es to append the object
                if (_.hasIn(device, devicereff)){
                    this.setWith(_.get(device, devicereff), value);
                }else{
                    let newValue = {};
                    this.setWith(newValue, value);
                    _.set(device,  devicereff,  newValue);
                }
            }else{
                //If the part is already in the device override / call setWith with the child refference otherwise use lodash-es to append the object
                if (_.hasIn(this.device, devicereff)){
                    this.setWith(_.get(this.device, devicereff), value);
                }else{
                    let newValue = {};
                    this.setWith(newValue, value);
                    _.set(this.device,  devicereff,  newValue);
                }
            }
        }else{
            if(device){
                this.setWith(device, value);
            }else{
                //The root of the device was changed call setWith
                this.setWith(this.device, value);
            }
        }
    }
    setWith(device, value){
        _.forEach(value, (m, i) => {
            if (_.hasIn(device, i)){
                if (!_.isPlainObject(device[i]) && !(_.isArray(device[i]) && device[i].length > 0 && _.isPlainObject(device[i][0]))){
                    let newValue = this.getWrightValue(device[i], m);
                    if (newValue  != null){
                        device[i] = newValue;
                    }
                }
            }else{
                let newValue = this.getWrightValue(device[i], m);
                if (newValue  != null){
                    device[i] = newValue;
                }
            }
        });
        _.forEach(device, (m, i) => {
            if (m === null || (_.isNumber(m) && _.isNaN(m)) || m === '' || (_.isArray(m) && m.length === 0) || m === "inherent"){
                delete device[i];
            }
        });
    }
    getWrightValue(obj, obj2){
        if (!_.isEqual(obj, obj2)){
            if (obj === undefined && obj2 != undefined && obj2 != ''){
                return obj2;
            }
            //Deleting value
            if (_.isString(obj) && obj != '' && obj2 === ''){
                return obj2;
            }
            if (_.isNumber(obj) && obj && ((obj2 === '' || !obj2)) && obj2 != 0){
                return NaN;
            }
            if (_.isNumber(obj2)){
                return obj2;
            }
            //Updating array
            if (_.isArray(obj) && _.isArray(obj2)){
                return obj2;
            }
            if (obj === undefined && _.isArray(obj2) && obj2.length === 1 && obj2[0] === ""){
                return null;
            }
            if (obj != undefined  && obj2 != undefined && ((obj2 != '' && obj2 != 'inherent') || (obj2.length == 1 && obj2[0] != ''))){
                return obj2;
            }
            if ((obj != undefined && (obj === true || obj === false)) && (obj2 === undefined || obj2 === '')){
                return null;
            }
            if ((obj != undefined && (obj === true || obj === false)) && (obj2 != undefined && (obj2 === true || obj2 === false))){
                return obj2;
            }
            //Handle dicomInstalled with inherent
            if (obj === undefined && (obj2 === false || obj2 === true)){
                return obj2;
            }
            if ((obj === true || obj === false) && (obj2 === 'inherent' || obj2 === false || obj2 === true)){
                return (obj2 === 'inherent') ? "inherent" : obj2;
            }
        }
        return null;
    }
    saveDevice(){

    }
    updateDevice(){
        if (_.hasIn(this.device, 'dicomDeviceName') && this.device.dicomDeviceName != ''){
            this.saveLanguageDataToLocalStorageOnSave();
            return this.$http.put(`${j4care.addLastSlash(this.mainservice.baseUrl)}devices/${this.device.dicomDeviceName}`, this.device)
                //.map(res => {let resjson; try{ let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/"); if(pattern.exec(res.url)){ WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";} resjson = res; }catch (e){ resjson = [];} return resjson;});
        }else{
            return null;
        }
    }
    saveLanguageDataToLocalStorageOnSave(){
/*        console.log("languages",_.get(this.device,"dcmDevice.dcmuiConfig[0].dcmuiLanguageConfig[0]"));
        console.log("defaultLanguage",_.get(this.device,"dcmDevice.dcmuiConfig[0].dcmuiLanguageConfig[0]"));
        if(_.hasIn(this.device,"dcmDevice.dcmuiConfig[0].dcmLanguages")){
            localStorage.setItem('dcmLanguages', _.get(this.device,"dcmDevice.dcmuiConfig[0].dcmLanguages"));
        }else{
            localStorage.removeItem('dcmLanguages');
        }*/
        if(_.hasIn(this.device,"dcmDevice.dcmuiConfig[0].dcmuiLanguageConfig[0]")){
            localStorage.setItem('languageConfig', JSON.stringify(_.get(this.device,"dcmDevice.dcmuiConfig[0].dcmuiLanguageConfig[0]")));
        }else{
            localStorage.removeItem('languageConfig');
        }
    }

    createDevice(){
        if (_.hasIn(this.device, 'dicomDeviceName') && this.device.dicomDeviceName != ''){
            return this.$http.post(`${j4care.addLastSlash(this.mainservice.baseUrl)}devices/${this.device.dicomDeviceName}`, this.device)
                //.map(res => {let resjson; try{ let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/"); if(pattern.exec(res.url)){ WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";} resjson = res; }catch (e){ resjson = [];} return resjson;});
        }else{
            return null;
        }
    }
    replaceCharactersInTitleKey(string, object){
        let re = /{(.*?)}/g;
        let m;
        let array = [];
        do {
            m = re.exec(string);
            if (m) {
                if (m[1]){
                    array.push(m[1]);
                }
            }
        } while (m);
        _.forEach(array, (i) => {
            if (_.hasIn(object, i)){
               string = _.replace(string, '{' + i + '}', object[i]);
            }else{
                string = _.replace(string, '{' + i + '}', '');
            }
        });
        return string || '';
    };
    getFormatValue(format, device):Observable<any>{
        if(this.getFormaterValue[format])
            return this.getFormaterValue[format](device);
        return of([]);
    }
    convertSchemaToForm(device, schema, params, defaultOpenBlock){
        let defaultExplicitSet = defaultOpenBlock;
        this.defaultOpenBlock = defaultOpenBlock || this.defaultOpenBlock;
        let form = [];
        if (_.hasIn(schema, 'type')){
            if ((schema.type === 'object' && _.hasIn(schema, 'properties')) || (schema.type === 'array' && _.hasIn(schema, 'items.properties'))){
                let schemaProperties;
                let propertiesPath = 'properties';
                let requiredArray;
                if (_.hasIn(schema, 'properties')){
                    schemaProperties = schema.properties;
                    requiredArray = schema.required || [];
                }else{
                    schemaProperties = schema.items.properties;
                    propertiesPath = 'items.properties';
                    requiredArray = schema.items.required || [];
                }
                _.forEach(schemaProperties, (m, i) => {
                    if(_.hasIn(m,'format')){
                        //Get the value / array that is needed for the defined format
                        this.getFormatValue(m.format, this.device || device).subscribe(
                            (formatValue) =>{
                                // setTimeout(()=>{
                                console.log("formatValue", formatValue)
                                if(formatValue && formatValue.length > 0){
                                    m.formatValue = formatValue.map((el)=>{
                                        if(typeof el === "string"){
                                            return {
                                                label:el,
                                                value:el
                                            }
                                        }else{
                                            return {
                                                label:this.replaceCharactersInTitleKey(Globalvar.DYNAMIC_FORMATER[m.format].labelKey,el),
                                                value:el[Globalvar.DYNAMIC_FORMATER[m.format].key]
                                            };
                                        }
                                    });
                                }else{
                                    if(Globalvar.DYNAMIC_FORMATER[m.format]){
                                        m.formatValue = {
                                            state:'missing',
                                            msg:Globalvar.DYNAMIC_FORMATER[m.format].msg
                                        };
                                    }
                                }
                                this.processSchemaEntries(m,i, requiredArray, propertiesPath, params, device, form);
                                // },500);
                            },(error)=>{
                                m.formatValue = null;
                                this.processSchemaEntries(m,i, requiredArray, propertiesPath, params, device, form);
                            });
                    }else{
                        this.processSchemaEntries(m,i, requiredArray, propertiesPath, params, device, form);
                    }
                });
                // console.log("form",Object.assign({},form));
                console.log("params",params);
                this.showNextGroup(form,defaultExplicitSet);
            }else{
                console.error('expected path object, properties, array or item.properties in schema not found: ', schema);
            }
        }else{
            console.error('Schema doesn\'t have type parameter', schema);
        }
        return form;
    }
    checkIfDuplicatedChild(newValue,params){
        let titleKeys;
        let newSchema;
        let arraysPath;
        try{

            if(_.hasIn(params,"schema")){
                newSchema = this.getSchemaFromPath(this.schema, params['schema']);
                if(newSchema.titleKey){
                    titleKeys =  this.getKeysFromTitleKey(newSchema.titleKey);
                }
                if(_.hasIn(params,"devicereff")){
                    arraysPath = this.extractArraysPathFromSpecific(params['devicereff']);
                    return this.checkIfChildeExist(_.get(this.device,arraysPath),titleKeys,newValue);
                }
            }
            return false;
        }catch (e){
            return false;
        }
    }
    checkIfChildeExist(allArrays,kayArray,newValue){
        let found:boolean = false;
        if(allArrays && allArrays.length > 0){
            allArrays.forEach(m=>{
                let equal:boolean = true;
                kayArray.forEach(k=>{
                    if(m[k] === newValue[k]){
                        equal = equal && true;
                    }else{
                        equal = false;
                    }
                });
                found = found || equal;
            });
            return found;
        }else{
            return false;
        }
    }
    extractArraysPathFromSpecific(path){
        const regex = /(^.*)\[\d*\]/g;
        let m;
        let endPath;
        while ((m = regex.exec(path)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            if(m[1])
                endPath = m[1];
        }
        return endPath;
    }
    getKeysFromTitleKey(titleKey){
        const regex = /\{(\w*)}/g;
        let m;
        let endArray = [];
        while ((m = regex.exec(titleKey)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            if(m[1])
                endArray.push(m[1]);
        }
        return endArray;
    }
    private processSchemaEntries(m,i, requiredArray, propertiesPath, params, device, form) {
        let $this = this;
        let value;
        let required = (_.indexOf(requiredArray, i) > -1);
        let validation = {
            required: required
        };
        console.log(`in processSchemaEntries i=${i}, m=`,m);
        if (_.hasIn(m, 'minimum')){
            validation['minimum'] = m.minimum;
        }
        if (_.hasIn(m, 'maximum')){
            validation['maximum'] = m.maximum;
        }
        if (_.hasIn(m, 'maxLength')){
            validation['maxLength'] = m.maxLength;
        }
        if (_.hasIn(m, 'minLength')){
            validation['minLength'] = m.minLength;
        }
        if (_.hasIn(m, 'exclusiveMinimum')){
            validation['exclusiveMinimum'] = m.exclusiveMinimum;
        }
        if (_.hasIn(m, 'exclusiveMaximum')){
            validation['exclusiveMaximum'] = m.exclusiveMaximum;
        }
        if (_.hasIn(m, 'pattern')){
            validation['pattern'] = m.pattern;
        }
        if (_.hasIn(device, i)){
            value = device[i];
        }else{
            if(_.hasIn(m,"default")){
                value = m.default;
            }
        }
        let newOrderSuffix = 0;
        if (m.order){
            newOrderSuffix = parseInt(m.order) / 100;
        }
        let options = [];
        switch (m.type) {
            case 'string':
                if (i === 'dicomDeviceName' && _.hasIn(device, 'dicomDeviceName') && device.dicomDeviceName != '' && this.breadcrumbs.length < 3){
                    form.push({
                        controlType: 'constantField',
                        key: i,
                        label: m.title,
                        description: m.description,
                        order: (5 + newOrderSuffix),
                        value: value,
                        show: (this.defaultOpenBlock === 'attr')
                    });
                }else{
                    if (_.hasIn(m, 'enum') || (_.hasIn(m,'formatValue') && m.formatValue )){
                        if(_.hasIn(m,'formatValue') && m.formatValue && !_.hasIn(m.formatValue,'state')){
                            _.forEach(m.formatValue, (opt) => {
                                options.push({
                                    label: opt.label,
                                    value: opt.value,
                                    active: (opt.value === value)
                                });
                            });
                        }else{
                            if(!_.hasIn(m.formatValue,'state')){
                                _.forEach(m.enum, (opt) => {
                                    this.addEnumValueToOption(opt, options, value);
                                });
                            }
                        }
                        if(_.hasIn(m.formatValue,'state')){
                            if(m.formatValue.state === "missing" && required)
                                form.push({
                                    controlType: 'message',
                                    key: i,
                                    label: m.title,
                                    description: m.description,
                                    msg:m.formatValue.msg,
                                    order: (5 + newOrderSuffix),
                                    show: (this.defaultOpenBlock === 'attr')
                                })
                            else
                                form.push(
                                    new InputText({
                                        key: i,
                                        label: m.title,
                                        description: m.description,
                                        type: 'string',
                                        value: value,
                                        order: (5 + newOrderSuffix),
                                        validation: validation,
                                        format: m.format,
                                        show: (this.defaultOpenBlock === 'attr')
                                    })
                                );
                        }else{
                            form.push(
                                new DropdownList({
                                    key: i,
                                    label: m.title,
                                    description: m.description,
                                    options: new OrderByPipe().transform(options,'label'),
                                    order: (5 + newOrderSuffix),
                                    validation: validation,
                                    value: value,
                                    show: (this.defaultOpenBlock === 'attr')
                                }),
                            );
                        }
                    }else{
                        if(_.hasIn(m, "format")  && (m.format === 'dcmAETitle' || m.format === 'dicomDeviceName' || m.format === 'hl7ApplicationName' || m.format === "webApp")){
                            form.push({
                                controlType: 'dynamiccheckbox',
                                key: i,
                                label: m.title,
                                description: m.description,
                                type: 'string',
                                value: (value) ? value : '',
                                order: (5 + newOrderSuffix),
                                validation: validation,
                                format: m.format,
                                show: (this.defaultOpenBlock === 'attr')
                            });
                        }else{
                            if(_.hasIn(m, "format")  && m.format === 'dcmDefaultLanguage'){
                                console.log("default",device);
                                console.log("this.device",this.device);
                                let options = [];
                                if(_.hasIn(this.device,"dcmDevice.dcmuiConfig[0].dcmuiLanguageConfig[0].dcmLanguages")){
                                    (<string[]>_.get(this.device,"dcmDevice.dcmuiConfig[0].dcmuiLanguageConfig[0].dcmLanguages")).forEach(language=>{
                                        let langObj = j4care.extractLanguageDataFromString(language);
                                        options.push({
                                            label: `${langObj.code} - ${langObj.name} - ${langObj.nativeName}`,
                                            value: language,
                                            active: language === value
                                        })
                                    })
                                }
                                form.push(
                                    new DropdownList({
                                        key: i,
                                        label: m.title,
                                        description: m.description,
                                        options: options,
                                        order: (5 + newOrderSuffix),
                                        validation: validation,
                                        value: value,
                                        show: (this.defaultOpenBlock === 'attr')
                                    })
                                );
                            }else{
                                form.push(
                                    new InputText({
                                        key: i,
                                        label: m.title,
                                        description: m.description,
                                        type: 'string',
                                        value: value,
                                        order: (5 + newOrderSuffix),
                                        validation: validation,
                                        format: m.format,
                                        show: (this.defaultOpenBlock === 'attr')
                                    })
                                );
                            }
                        }
                    }
                }
                break;
            case 'boolean':
                if (i === 'dicomVendorData'){
                    if (_.hasIn(device, 'dicomDeviceName') && device.dicomDeviceName != ''){ //Show upload button just if the device is on edit mode (preventing trying to upload files for a device that doesn't exist yet)
                        if (_.hasIn(device, 'dicomVendorData') && device.dicomVendorData === true && _.hasIn(device, 'dicomDeviceName') && device.dicomDeviceName != ''){ // If the vendordata is tru than show the download lin
                            form.push({
                                controlType: 'filedownload',
                                key: i,
                                label: m.title,
                                deviceName: device.dicomDeviceName,
                                description: m.description,
                                order: (5 + newOrderSuffix),
                                downloadUrl: `${j4care.addLastSlash(this.mainservice.baseUrl)}devices/${device.dicomDeviceName}/vendordata`,
                                show: (this.defaultOpenBlock === 'attr')
                            });
                        }else{
                            //If the vendor data is missing or false than show the upload button
                            form.push({
                                controlType: 'fileupload',
                                modus: 'upload',
                                key: i,
                                label: m.title,
                                deviceName: device.dicomDeviceName,
                                description: m.description,
                                order: (5 + newOrderSuffix),
                                show: (this.defaultOpenBlock === 'attr')
                            });
                        }
                    }
                }else{
                    // if (i === 'dicomInstalled' && _.hasIn(params, 'devicereff') && _.hasIn(params, 'schema')){
                    if(required){
                        options = [
                            {key: $localize `:@@True:True`,  value: true},
                            {key: $localize `:@@False:False`,  value: false}
                        ];
                        if (value === true || value === false){
                            //true
                            if (value === true){
                                options[0]['active'] = true;
                            }else{
                                //false
                                options[1]['active'] = true;
                            }
                        }
                    }else{
                        options = [
                            {key: $localize `:@@True:True`,  value: true},
                            {key: $localize `:@@False:False`,  value: false},
                            {key: $localize `:@@Unchecked:Unchecked`,  value: 'inherent'},
                        ];
                        if (value === true || value === false){
                            //true
                            if (value === true){
                                options[0]['active'] = true;
                            }else{
                                //false
                                options[1]['active'] = true;
                            }
                        }else{
                            //Inherited
                            options[2]['active'] = true;
                        }
                    }
                    /*                                }else{
                     options = [
                     {key: 'True',  value: true},
                     {key: 'False',  value: false}
                     ];
                     if ((value != undefined && value != '') || value === false){
                     //true
                     if (value === true){
                     options[0]['active'] = true;
                     }else{
                     //false
                     options[1]['active'] = true;
                     }
                     }
                     }*/
                    form.push(
                        new RadioButtons({
                            key: i,
                            label: m.title,
                            description: m.description,
                            options: options,
                            order: (5 + newOrderSuffix),
                            validation: validation,
                            value:value,
                            show: (this.defaultOpenBlock === 'attr')
                        })
                    );
                    /*                                form.push(
                     new DropdownList({
                     key: i,
                     label: m.title,
                     description: m.description,
                     options: options,
                     order: (5 + newOrderSuffix),
                     validation: validation,
                     value: value
                     }),
                     );*/
                }
                break;
            case 'array':
                if (i == 'dicomNetworkConnectionReference'|| (_.hasIn(m,'formatValue') && m.formatValue && m.formatValue.length > 0 )){
                    if(_.hasIn(m,'formatValue') && m.formatValue && i != 'dicomNetworkConnectionReference'){
                       if(!_.hasIn(m.formatValue,'state')){
                            _.forEach(m.formatValue, (opt) => {
                                options.push({
                                    key: opt.label,
                                    value: opt.value,
                                    active: (_.indexOf(value, opt.value) > -1)
                                });
                            });
                       }else{
                           _.forEach(m.enum, (opt) => {
                               this.addEnumValueToOption(opt, options, value, true);
                           });
                       }
                    }else{
                        this.device = this.device || device;
                        _.forEach(this.device['dicomNetworkConnection'], (opt, i) => {
                            options.push({
                                value: '/dicomNetworkConnection/' + i,
                                key: opt.cn + ' (' + opt.dicomHostname + ((opt.dicomPort) ? ':' + opt.dicomPort : '') + ')',
                                active: (_.indexOf(value, '/dicomNetworkConnection/' + i) > -1)
                            });
                        });
                    }
/*                    if(m.format === "dicomDeviceName"){
                        form.push(
                            new ArrayElement({
                                key: i,
                                label: m.title,
                                description: m.description,
                                type: 'text',
                                value: (value) ? value : [''],
                                order: (5 + newOrderSuffix),
                                validation: validation,
                                format: m.format
                            }))
                    }else{*/
                        if(_.hasIn(m.formatValue,'state')){
                            form.push({
                                controlType: 'message',
                                key: i,
                                label: m.title,
                                description: m.description,
                                msg:m.formatValue.msg,
                                order: (5 + newOrderSuffix),
                                show: (this.defaultOpenBlock === 'attr')
                            })
                        }else{
                            form.push(
                                new Checkbox({
                                    key: i,
                                    label: m.title,
                                    format: m.format,
                                    description: m.description,
                                    options: new OrderByPipe().transform(options,'key'),
                                    order: (5 + newOrderSuffix),
                                    validation: validation,
                                    search:'',
                                    show: (this.defaultOpenBlock === 'attr')
                                })
                            );
                        }
                    // }/**/
                    console.log(`ì= ${i} form= `,form);
                }else{
                    console.log('this.device', this.device);
                    if (_.hasIn(m, 'items.enum')){
                        _.forEach(m.items.enum, (opt) => {
                            this.addEnumValueToOption(opt, options, value, true, true);
                        });
                        form.push(
                            new Checkbox({
                                key: i,
                                label: m.title,
                                description: m.description,
                                options: new OrderByPipe().transform(options,'key'),
                                order: (5 + newOrderSuffix),
                                validation: validation,
                                search:'',
                                show: (this.defaultOpenBlock === 'attr')
                            })
                        );
                    }else{
                        let url = '';
                        if (_.hasIn(m, 'items.$ref')) {
                            if (value && _.isObject(value)){
                                if (Object.keys(value).length === 0){
                                    url = '/device/edit/' + params.device;
                                    url = url +  ((params.devicereff) ? '/' + params.devicereff + '.' + i + '[0]' : '/' + i + '[0]');
                                    url = url +  ((params.schema) ? '/' + params.schema + '.' + propertiesPath + '.' + i : '/properties.' + i);
                                    console.log('url', url);
                                    form.push({
                                        controlType: 'buttondropdown',
                                        key: i,
                                        label: m.title,
                                        description: m.description,
                                        addUrl: url,
                                        order: (3 + newOrderSuffix),
                                        show: (this.defaultOpenBlock === 'child')
                                    });
                                }else{
                                    options = [];
                                    let maxVali = 0;
                                    _.forEach(value, (valm, vali) => {
                                        let title;
                                        maxVali = parseInt(vali);
                                        // $this.replaceCharactersInTitleKey(m.titleKey,valm);
                                        url = '/device/edit/' + params.device;
                                        url = url +  ((params.devicereff) ? '/' + params.devicereff + '.' + i + '[' + vali + ']' : '/' + i + '[' + vali + ']');
                                        url = url +  ((params.schema) ? '/' + params.schema + '.' + propertiesPath + '.' + i : '/properties.' + i);
                                        if (_.hasIn(m, 'titleKey')){
                                            title = $this.replaceCharactersInTitleKey(m.titleKey, valm);
                                        }else{
                                            title = m.title + '[' + vali + ']';
                                        }
                                        options.push({
                                            title: title,
                                            description: m.description,
                                            key: i,
                                            url: url,
                                            currentElementUrl: ((params.devicereff) ? params.devicereff + '.' + i + '[' + vali + ']' : i + '[' + vali + ']'),
                                            refString: `/dicomNetworkConnection/${vali}`
                                        });
                                    });
                                    let addUrl = '/device/edit/' + params.device;
                                    addUrl = addUrl +  ((params.devicereff) ? '/' + params.devicereff + '.' + i + '[' + (maxVali + 1) + ']' : '/' + i + '[' + (maxVali + 1) + ']');
                                    addUrl = addUrl +  ((params.schema) ? '/' + params.schema + '.' + propertiesPath + '.' + i : '/properties.' + i);
                                    console.log('addUrl', addUrl);
                                    new OrderByPipe().transform(options,'title');
                                    form.push({
                                        controlType: 'buttondropdown',
                                        key: i,
                                        label: m.title,
                                        description: m.description,
                                        options: options,
                                        addUrl: addUrl,
                                        order: (3 + newOrderSuffix),
                                        show: (this.defaultOpenBlock === 'child')
                                    });
                                }
                            }else{
                                let addUrl = '/device/edit/' + params.device;
                                addUrl = addUrl +  ((params.devicereff) ? '/' + params.devicereff + '.' + i + '[0]' : '/' + i + '[0]');
                                addUrl = addUrl +  ((params.schema) ? '/' + params.schema + '.' + propertiesPath + '.' + i : '/properties.' + i);
                                form.push({
                                    controlType: 'buttondropdown',
                                    key: i,
                                    label: m.title,
                                    description: m.description,
                                    options: [],
                                    addUrl: addUrl,
                                    order: (3 + newOrderSuffix),
                                    show: (this.defaultOpenBlock === 'child')
                                });
                            }
                        }else{
                            if (value && _.isObject(value) && (Object.keys(value).length > 0 && _.isObject(value[0]))){
                                options = [];
                                let maxVali = 0;
                                _.forEach(value, (valm, vali) => {
                                    let title;
                                    maxVali = parseInt(vali);
                                    // $this.replaceCharactersInTitleKey(m.titleKey,valm);
                                    url = '/device/edit/' + params.device;
                                    url = url +  ((params.devicereff) ? '/' + params.devicereff + '.' + i + '[' + vali + ']' : '/' + i + '[' + vali + ']');
                                    url = url +  ((params.schema) ? '/' + params.schema + '.' + propertiesPath + '.' + i : '/properties.' + i);
                                    if (_.hasIn(m, 'titleKey')){
                                        title = $this.replaceCharactersInTitleKey(m.titleKey, valm);
                                    }else{
                                        title = m.title + '[' + vali + ']';
                                    }
                                    options.push({
                                        title: title,
                                        description: m.description,
                                        key: i,
                                        url: url,
                                        currentElementUrl: ((params.devicereff) ? params.devicereff + '.' + i + '[' + vali + ']' : i + '[' + vali + ']'),
                                        order: (3 + newOrderSuffix),
                                        show: (this.defaultOpenBlock === 'child')
                                    });
                                });
                                let addUrl = '/device/edit/' + params.device;
                                addUrl = addUrl +  ((params.devicereff) ? '/' + params.devicereff + '.' + i + '[' + (maxVali + 1) + ']' : '/' + i + '[' + (maxVali + 1) + ']');
                                addUrl = addUrl +  ((params.schema) ? '/' + params.schema + '.' + propertiesPath + '.' + i : '/properties.' + i);
                                console.log('*addUrl', addUrl);
                                form.push({
                                    controlType: 'buttondropdown',
                                    key: i,
                                    label: m.title,
                                    description: m.description,
                                    options: new OrderByPipe().transform(options,'title'),
                                    addUrl: addUrl,
                                    order: (3 + newOrderSuffix)
                                });
                            }else{
                                if (_.hasIn(m, 'items.properties')){
                                    let addUrl = '/device/edit/' + params.device;
                                    addUrl = addUrl +  ((params.devicereff) ? '/' + params.devicereff + '.' + i + '[0]' : '/' + i + '[0]');
                                    addUrl = addUrl +  ((params.schema) ? '/' + params.schema + '.' + propertiesPath + '.' + i : '/properties.' + i);
                                    form.push({
                                        controlType: 'buttondropdown',
                                        key: i,
                                        label: m.title,
                                        description: m.description,
                                        options: [],
                                        addUrl: addUrl,
                                        order: (3 + newOrderSuffix),
                                        show: (this.defaultOpenBlock === 'child')
                                    });
                                }else{
                                    let type = (_.hasIn(m, 'items.type')) ? m.items.type : 'text';
                                    if(m.format === 'dicomDeviceName' || m.format === 'dcmAETitle' || m.format === 'hl7ApplicationName' || m.format === 'webApp'){
                                        form.push({
                                            controlType: 'dynamiccheckbox',
                                            key: i,
                                            label: m.title,
                                            description: m.description,
                                            type: 'array',
                                            value: (value) ? value : [''],
                                            order: (5 + newOrderSuffix),
                                            validation: validation,
                                            format: m.format,
                                            show: (this.defaultOpenBlock === 'attr')
                                        });
                                    }else{
                                        form.push(
                                            new ArrayElement({
                                                key: i,
                                                label: m.title,
                                                description: m.description,
                                                type: type,
                                                value: (value) ? value : [''],
                                                order: (5 + newOrderSuffix),
                                                validation: validation,
                                                format: m.format,
                                                show: (this.defaultOpenBlock === 'attr')
                                            })
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
                break;
            case 'integer':
                if(_.hasIn(m, 'enum')){
                    _.forEach(m.enum, (opt) => {
                        this.addEnumValueToOption(opt,options,value);
                    });
                    form.push(
                        new DropdownList({
                            key: i,
                            label: m.title,
                            description: m.description,
                            options: new OrderByPipe().transform(options,'label'),
                            order: (5 + newOrderSuffix),
                            validation: validation,
                            value: value,
                            type: 'number',
                            show: (this.defaultOpenBlock === 'attr')
                        }),
                    );
                }else{
                    form.push(
                        new InputNumber({
                            key: i,
                            label: m.title,
                            description: m.description,
                            value: parseFloat(value),
                            type: 'number',
                            order: (5 + newOrderSuffix),
                            validation: validation,
                            show: (this.defaultOpenBlock === 'attr')
                        })
                    );
                }
                break;
            default:
                if(_.hasIn(device,i) && _.size(value) < 1){
                    value = 1;
                }else{
                    value =  _.size(value);
                }
                let url = '/device/edit/' + params.device;
                url = url +  ((params.devicereff) ? '/' + params.devicereff + '.' + i : '/' + i);
                url = url +  ((params.schema) ? '/' + params.schema + '.' + propertiesPath + '.' + i : '/properties.' + i);
                form.push({
                    controlType: 'button',
                    label: m.title,
                    title: m.title,
                    description: m.description,
                    url: url,
                    devicereff: (params.devicereff) ? params.devicereff + '.' + i : i,
                    order: (1 + newOrderSuffix),
                    value: value,
                    show: (this.defaultOpenBlock === 'ext')
                });
        }

    }
    showNextGroup(form, defaultExplicitSet){
        console.log("defaultExplicitSet",defaultExplicitSet)
        let check = (order,i)=>{
                switch(i){
                  case 1:
                      return (order >= 1 && order < 3);
                  case 2:
                      return (order >= 3 && order < 5);
                  case 3:
                      return (order >= 5);
              }
            };
            let extExist = false;
            Object.keys(form).forEach(element=>{
                if(check(form[element]['order'],1))
                    extExist = true;
            });
            if(!extExist){
                let childExist = false;
                Object.keys(form).forEach(element=>{
                        if(check(form[element]['order'],2)){
                            childExist = true;
                            if(!defaultExplicitSet || defaultExplicitSet === "child" || defaultExplicitSet === "ext")
                                form[element]['show'] = true;
                        }else
                            if(!defaultExplicitSet || defaultExplicitSet === "child" || defaultExplicitSet === "ext")
                                form[element]['show'] = false;
                });
                if(!childExist){
                    Object.keys(form).forEach(element=>{
                        if(check(form[element]['order'],3)){
                                form[element]['show'] = true;
                        }
                    });
                }
            }

    }

    /*
    * @param key:string key of the element
    * @param value:ay the new value of the element
    * @param use:string[] references where the new value should be changed elsewhere
    * */
    setValueToReferences(oldValue:any, newValue:any, use:string[]){
        console.log("oldValue",oldValue);
        console.log("newValue",newValue);
        console.log("use",use);
        const regex = /([\w.]+)(\[\*\])|([\w.]+)/g;
        let m;
        try{
            use.forEach(ref=>{
                let regexPaths = [];
                while ((m = regex.exec(ref)) !== null) {
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    regexPaths.push(m);
                }
                function set(devicePart, paths, pathsCurrentIndex){
                    // if(_.has(devicePart, paths[pathsCurrentIndex])){
                        if(paths[pathsCurrentIndex][1] && _.hasIn(devicePart, paths[pathsCurrentIndex][1].slice(1))){
                            (<any[]>_.get(devicePart, paths[pathsCurrentIndex][1].slice(1))).forEach((element,i)=>{
                                if(typeof element === "string"){
                                    if(element === oldValue){
                                        _.set(devicePart, `${paths[pathsCurrentIndex][1].slice(1)}[${i}]`, newValue);
                                    }
                                }else{
                                    set(element,paths, pathsCurrentIndex + 1);
                                }
                            });
                        }
                        if(paths[pathsCurrentIndex][3] && _.hasIn(devicePart, paths[pathsCurrentIndex][3].slice(1))){
                            let returnedElement = _.get(devicePart, paths[pathsCurrentIndex][3].slice(1));
                            if(typeof returnedElement === "string"){
                                if(returnedElement === oldValue){
                                    _.set(devicePart, paths[pathsCurrentIndex][3].slice(1), newValue);
                                }
                            }else{
                                set(_.get(devicePart, paths[pathsCurrentIndex][3].slice(1)), paths,pathsCurrentIndex + 1);
                            }
                        }
                    // }
                }
                set(this.device,regexPaths,0);
            });
            console.log("device",this.device);
        }catch (e) {
            j4care.log("Trying to update the new value in the device according to 'use' array, (device-cofigurator.service.ts)",e);
        }
    }

    getSchemaDeep(currentSchema, schemaPath){
        let paramArray = schemaPath.split('.');
        return this.getSchemaDeepHelper(currentSchema,paramArray,0);
    }
    private getSchemaDeepHelper(currentSchema,paramArray, currentIndex){
        let path = paramArray.filter((m,i)=> i <= currentIndex).join('.');
        let previousPath = paramArray.filter((m,i)=> i < currentIndex).join('.');
        if(_.hasIn(currentSchema,path)){
            if(currentIndex >= paramArray.length-1){
                return this.getSchemaPart(currentSchema,path,paramArray, currentIndex);
            }else{
                return this.getSchemaDeepHelper(currentSchema,paramArray,currentIndex + 1);
            }
        }else{
            return this.getSchemaPart(currentSchema, previousPath, paramArray, currentIndex);
        }

    }
    private getSchemaPart(currentSchema, path, paramArray, currentIndex) {
        if (_.hasIn(currentSchema, `${path}.$ref`) || _.hasIn(currentSchema,  `${path}.items.$ref`) || _.hasIn(currentSchema,  `${path}.properties.$ref`)) {
            let schemaName = _.get(currentSchema, `${path}.$ref`) || _.get(currentSchema,  `${path}.items.$ref`) || _.get(currentSchema,  `${path}.properties.$ref`);
            let schemaRefPath =   _.hasIn(currentSchema, `${path}.$ref`) && `${path}.$ref` ||
                                         _.hasIn(currentSchema,  `${path}.items.$ref`) && `${path}.items.$ref` ||
                                         `${path}.properties.$ref`;
            return this.getSchema(schemaName).pipe(switchMap((newSchema)=> {
                let schemaPathWithoutRef = schemaRefPath.replace('.$ref', '');
                _.set(currentSchema, schemaPathWithoutRef,newSchema);
                return this.getSchemaDeepHelper(currentSchema, paramArray, currentIndex + 1);
            }))
        } else {
            return of(currentSchema);
        }
    }

    getMissingBreadcrumbObjects(lastBreadcrumbObject, breadcrumbs){
        if(lastBreadcrumbObject.url != this.breadcrumbs[this.breadcrumbs.length - 1 ].url){
            breadcrumbs.push(lastBreadcrumbObject);
            let previousBreadcrumb = this.getPreviousBreadcrumbObject(lastBreadcrumbObject);
            return this.getMissingBreadcrumbObjects(previousBreadcrumb,breadcrumbs);
        }else{
            return breadcrumbs.reverse();
        }
    }


    getPreviousBreadcrumbObject(params){
        const regex = /\/(.*)\/(.*)\/(.*)\/(.*)/g;
        let match;
        let prevUrl;
        if ((match = regex.exec(params.url)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            let prevSchemaPath = this.getPreviousPathPart(match[4]);
            let prevDevicePath = this.getPreviousPathPart(match[3]);
            let newModel = _.get(this.device,prevDevicePath);
            let newSchema = _.get(this.schema,prevSchemaPath);
            console.log("schema",newSchema);
            console.log("device",newModel);
            console.log("title",this.getBreadcrumbTitleFromModel(newModel, newSchema));
            prevUrl = prevDevicePath && prevSchemaPath ? `/${match[1]}/${match[2]}/${prevDevicePath}/${prevSchemaPath}` : `/${match[1]}/${match[2]}`;
            console.log("prevUrl",prevUrl);
            console.log("params",params);
            console.log("getPrefixAndSuffixArray=",this.getPrefixAndSuffixArray(prevUrl,this.allOptions[prevSchemaPath]));
            console.log("getoption",this.getBreadcrumbOptions(prevDevicePath,prevSchemaPath,this.allOptions,this.device, `/${match[1]}/${match[2]}`));
            let prefixSuffix = this.getPrefixAndSuffixArray(prevUrl,this.allOptions[prevSchemaPath]);
            return {
                url:prevUrl,
                prefixArray:prefixSuffix.prefix,
                suffixArray:prefixSuffix.suffix,
                allArray:[...prefixSuffix.prefix,...prefixSuffix.suffix],
                title:this.getBreadcrumbTitleFromModel(newModel, newSchema),
                childObjectTitle: (newSchema && newSchema.title) ? newSchema.title : '',
                devicereff: prevDevicePath,
                materialIconName:this.getMaterialIconNameForBreadcrumbs(prevDevicePath),
            }
        }
    }
    getBreadcrumbOptions(devicePath,schemaPath, allOptions, deviceObject, prefixUrl){
        try{
            if(devicePath.indexOf("[") > -1){
                let pathWithoutIndex = this.extractArraysPathFromSpecific(devicePath);
                let options = _.get(deviceObject,pathWithoutIndex).map((el,i)=>{
                    return {
                        title:this.getBreadcrumbTitleFromModel(el, _.get(this.schema,schemaPath)),
                        currentElementUrl:`${pathWithoutIndex}[${i}]`,
                        url:`${prefixUrl}/${pathWithoutIndex}[${i}]/${schemaPath}`
                    }
                });
                allOptions[schemaPath] = new OrderByPipe().transform(options,'title') || [];
                return allOptions[schemaPath];
            }
        }catch(e: unknown){
            return [];
        }

    }
    getPreviousPathPart(path){
        console.log("path",path);
        try{
            //let path = "properties.dicomNetworkConnection.items.properties.dcmNetworkConnection";
            let splited = path.split(".");
            let i = splited.length - 1;
            let groupString = "";
            let tempArray = [];
            while(i > -1){
                if(groupString === ""){
                    groupString = splited[i];
                    i--;
                }else{
                    if(["properties", "items"].indexOf(splited[i]) > -1){
                        groupString = `${splited[i]}.${groupString}`
                        i--;
                    }else{
                        tempArray.push(groupString);
                        groupString = "";
                    }
                }

            }
            if(groupString){
                tempArray.push(groupString);
            }
            tempArray.splice(0,1);
            return tempArray.reverse().join(".");

        }catch(e: unknown){
            console.error(e);
            return path;
        }
    }

    reloadArchive(){
        let archiveUrl;
        try{
            const deviceName = _.get(this.device, 'dicomDeviceName');
            if(_.hasIn(this.mainservice,'dcm4cheeArcConfig.deviceNameUrlMap')){
                const mappedArchiveDevices = this.mainservice['dcm4cheeArcConfig']['deviceNameUrlMap'];
                Object.keys(mappedArchiveDevices).forEach(url=>{
                    if(mappedArchiveDevices[url] === deviceName){
                        archiveUrl = url;
                    }
                });
            }
        }catch (e){
            console.error(e);
        }
        return this.controlService.reloadArchive(archiveUrl);
    }
    addEnumValueToOption(opt, options, value, useKey?:boolean, checkContainingIndex?:boolean){
        try{
            let optObject = {};
            if(opt && typeof opt === "string" && opt.indexOf("|") > -1){
                let [optValue, description,label] = opt.split("|");
                optObject = {
                    description:description ?? '',
                    value: optValue ?? '',
                    active: (optValue === value || ( checkContainingIndex && _.indexOf(value, optValue) > -1))
                };
                if(useKey){
                    optObject["key"] = label || optValue || '';
                }else{
                    optObject["label"] = label || optValue || '';
                }
            }else {
                optObject = {
                    value: opt,
                    active: (opt === value || (checkContainingIndex && _.indexOf(value, opt) > -1))
                };
                if(useKey){
                    optObject["key"] = opt;
                }else{
                    optObject["label"] = opt;
                }
            }
            options.push(optObject);
        }catch (e) {
            console.error(e)
        }
    }
}
