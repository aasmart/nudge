import "../common/htmlElement"
import "../common/htmlFormElement"
import "../common/date"
import { FormInputElement } from "../common/htmlFormElement";

function isInputElement(_obj: any): _obj is FormInputElement  {
    return true;
}

class InputForm {
    formElement: HTMLFormElement
    inputs: Map<String, FormInputElement>
    selectInputOptionsProvider: Record<string, any> 

    constructor(
        formClass: string, 
        onSubmit: (e: Event) => boolean, 
        onReset: (e: Event) => boolean,
        selectInputOptionsProvider: Record<string, any> = {}
    ) {
        this.inputs = new Map()
        this.formElement = <HTMLFormElement>document.getElementsByClassName(formClass)[0];
        this.selectInputOptionsProvider = selectInputOptionsProvider

        this.formElement.addEventListener('submit', e => onSubmit(e))
        this.formElement.addEventListener('reset', e => onReset(e))

        const inputElements: Array<FormInputElement>
             = Array.from(this.formElement.querySelectorAll("input, button, textarea, select"))

        inputElements.forEach(e => {
            const id = e.getAttribute('id');
            const type = e.getAttribute('type')

            if(id == null)
                return

            // Handle the error message
            if((isInputElement(e))) {
                const errorMessage = document.createElement('p')
                errorMessage.classList.add('error-message')

                const updateValidationMessage = () => { errorMessage.innerText = e.validationMessage }

                e.insertAdjacentElement("afterend", errorMessage)

                e.onkeyup = updateValidationMessage
                e.onmousedown = updateValidationMessage
                updateValidationMessage()

                e.oninvalid = () => {
                    e.setDirty(true)
                    updateValidationMessage()
                }
            }

            if(e instanceof HTMLSelectElement || e.getAttribute("role") === "combobox") {
                initSelectMenu(e, selectInputOptionsProvider);
            }

            // Add unit selection dropdowns
            const useUnits = e.getAttribute('use-units')
            if(useUnits) {
                switch(useUnits) {
                    case 'time':
                        const units = document.createElement('span')
                        units.id = `${id}-units`
                        units.classList.add('units')
                        e.insertAdjacentElement("afterend", units)

                        units.innerText = "minutes";
                        break;
                }
            }

            switch(type) {
                case 'checkbox':
                    const toggles = e.getAttribute('toggles')
                    if(toggles == null || !(e instanceof HTMLInputElement))
                        break

                    e.onchange = () => { 
                        const input = this.inputs.get(toggles)
                        if(input == null)
                            return;
                        
                        input.disabled = !e.checked
                    }

                    break
                default:
                    break
            }

            e.onkeydown = () => e.setDirty(true)
            e.onmousedown = () => e.setDirty(true)

            this.inputs.set(id, e)
        })
    }

    setValue(input: string, value: any) {
        const element: any = this.getInputElement(input)

        if(element == null)
            return

        if(!element.disabled)
            element.value = value.toString();
        else
            element.value = ''
    }

    getValue(input: string, checkActive: boolean = false) {
        if(checkActive && !this.activeAndFilled(input))
            return ''

        return this.getInputElement(input)?.value || ''
    }

    getValueAsNumber(input: string, checkActive: boolean = false) {
        if(checkActive && !this.activeAndFilled(input))
            return ''

        const element = this.getInputElement(input)
        if(!element || !(element instanceof HTMLInputElement))
            return ''

        return element.valueAsNumber
    }

    hasValue(input: string) {
        return (this.inputs.get(input)?.value?.length || 0) > 0
    }

    activeAndFilled(input: string): boolean {
        const inputElement = this.getInputElement(input)
        if(inputElement == null)
            return false;

        return !inputElement.disabled && inputElement.value.length > 0
    }

    setChecked(input: String, checked: boolean) {
        const element = this.inputs.get(input)
        if(!element || !(element instanceof HTMLInputElement) || element.getAttribute('type') !== 'checkbox')
            return
        
        element.checked = checked
        element.dispatchEvent(new Event('change'))
    }

    getInputElement(input: String): FormInputElement | undefined  {
        return this.inputs.get(input) || undefined
    }

    setFromJson(json: string): void {
        const camelCaseRegex = /.([a-z])+/g
    
        // Set all the fields
        const obj = JSON.parse(json)
        for(let key in obj) {
            const id = key.match(camelCaseRegex)?.flatMap(s => s.toLowerCase()).join('-') || ''
            const element = <FormInputElement>document.getElementById(id);

            if(element == null)
                continue

            if(element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
                element.value = obj[key]
        }

        // Set the toggle checkboxes
        Array.from(this.inputs.values()).forEach(input => {
            const type = input.getAttribute('type') 
            if(type !== 'checkbox')
                return
            
            const toggles = input.getAttribute('toggles')
            if(toggles == null)
                return

            this.setChecked(input.id, this.hasValue(toggles))
        })
    }
}

function initSelectMenu(e: FormInputElement, selectInputOptionsProvider: Record<string, any> = {}) {
    const optionsFrom = e.getAttribute("options-from");
    if(!optionsFrom) {
        console.error(`Select element \'${e.name}\' does not have a valid \'options-from\` attribute.`);
        return;
    }

    // Convert the corresponding enum type to its keys
    const enumObj = selectInputOptionsProvider[optionsFrom];
    const options = Object.keys(enumObj);
    if(!options) {
        console.error(`Failed to find registered select options provider called \'${optionsFrom}\'`);
        return;
    }

    if(e.getAttribute("role") === "combobox") {
        const listbox = document.getElementById(`${e.id}--listbox`);
        if(!listbox) {
            console.error(`Failed to find a listbox for combobox \'${e.id}\'`);
            return;
        }

        const selectWrapper: HTMLElement | null = e.parentElement;

        e.addEventListener("click", () => {
            e.setAttribute("aria-expanded", "true");
        });

        selectWrapper?.addEventListener("blur", () => {
            e.setAttribute("aria-expanded", `${false}`);
        })

        listbox.append(...options.map((option, index) => {
            const optionElement = document.createElement("li");
            optionElement.innerText = enumObj[option]; // Get enum name as string
            optionElement.setAttribute("value", option);
            optionElement.id = `${e.id}--${option}`;

            optionElement.addEventListener("click", () => {
                const allOptions = Array.from(listbox.getElementsByTagName("li"));
                setSelectMenuSelected(e as HTMLInputElement, allOptions, index);
                e.setAttribute("aria-expanded", "false");
            })
        
            return optionElement;
        }));

        setSelectMenuSelected(e as HTMLInputElement, Array.from(listbox.getElementsByTagName("li")), 0);
    } else {
        e.append(...options.map(option => {
            const optionElement = document.createElement("option");
            optionElement.innerText = enumObj[option]; // Get enum name as string
            optionElement.setAttribute("value", option);

            return optionElement;
        }));
    }
}

function setSelectMenuSelected(selectInput: HTMLInputElement, options: HTMLElement[], index: number) {
    const option = options[index];
    if(!option) {
        console.error("Option is null");
        return;
    }

    options.forEach(e => {
        e.setAttribute("selected", "false");
    });

    selectInput.setAttribute("aria-activedescendant", option.id);
    option.setAttribute("selected", "true");
    selectInput.value = option.innerText;
}

export { InputForm }