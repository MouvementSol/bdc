import {
    fetchAuth,
    isMemberIdMlc,
    getAPIBaseURL,
    NavbarTitle,
    SelectizeUtils,
} from 'Utils'

import ModalMlc from 'Modal'

const {
    Input,
    RadioGroup,
    Row,
    Textarea,
} = FRC

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import ReactSelectize from 'react-selectize'
const SimpleSelect = ReactSelectize.SimpleSelect

const {
    ToastContainer
} = ReactToastr
const ToastMessageFactory = React.createFactory(ReactToastr.ToastMessage.animation)


Formsy.addValidationRule('isMemberIdMlc', isMemberIdMlc)

Formsy.addValidationRule('isValidPhoneNumber', (values, value) =>
{
    if (!value) {
        return false;
    }

    if (value.indexOf('.') === -1 && value.indexOf(' ') === -1) {
        return true;
    }
    else {
        return false;
    }
})

const MemberAddForm = React.createClass({

    mixins: [FRC.ParentContextMixin],

    propTypes: {
        children: React.PropTypes.node
    },

    render() {
        return (
            <Formsy.Form
                className={this.getLayoutClassName()}
                {...this.props}
                ref="memberaddform"
            >
                {this.props.children}
            </Formsy.Form>
        );
    }
})

class MemberAddPage extends React.Component {

    constructor(props) {
        super(props);

        // Default state
        var stateData = JSON.parse(sessionStorage.getItem('restart-member-add'))

        if (stateData) {
            stateData.birth = moment(stateData.birth)
            stateData.isModalOpen = false
            stateData.modalBody = undefined
            this.state = stateData
        }
        else {
            this.state = {
                isModalOpen: false,
                canSubmit: false,
                validFields: false,
                validCustomFields: false,
                login: "",
                lastname: "",
                firstname: "",
                address: "",
                options_recevoir_actus: undefined,
                civility_id: undefined,
                country: undefined,
                zip: undefined,
                zipSearch: undefined,
                zipList: undefined,
                town: undefined,
                townList: undefined,
                birth: undefined,
                phone: "",
                email: "",
                assoSaisieLibre: false,
                fkAsso: undefined,
                fkAsso2: undefined,
                fkAssoAllList: undefined,
                fkAssoApprovedList: undefined,
                formData: undefined,
                modalBody: undefined,
            }
        }

        // Get countries for the country selector
        var computeCountries = (countries) => {
            var france = _.findWhere(countries, {label: "France"})
            var france = {label: "France", value: france.id}

            var res = _.chain(countries)
                .filter(function(item){ return item.active == 1 && item.code != "" &&  item.label != "France" })
                .map(function(item){ return {label: item.label, value: item.id} })
                .sortBy(function(item){ return item.label })
                .value()

            // We add France at first position of the Array, and we set it as the default value
            res.unshift(france)
            this.setState({countries: res, country: france})
        }

        // Get all associations (no filter): fkAssoAllList
        var computeAllAssociations = (associations) => {
            var res = _.chain(associations)
                .map(function(item){
                    if (item.nb_parrains == "0")
                        var label = item.nom + " – " + __("Aucun parrain")
                    else if (item.nb_parrains == "1")
                        var label = item.nom + " – " + item.nb_parrains + " " + __("parrain")
                    else
                        var label = item.nom + " – " + item.nb_parrains + " " + __("parrains")
                    return {label: label, value: item.id}
                })
                .sortBy(function(item){ return item.label })
                .value()

            this.setState({fkAssoAllList: res})
        }

        // Get only approved associations: fkAssoApprovedList
        var computeApprovedAssociations = (associations) => {
            var res = _.chain(associations)
                .map(function(item){
                    if (item.nb_parrains == "0")
                        var label = item.nom + " – " + __("Aucun parrain")
                    else if (item.nb_parrains == "1")
                        var label = item.nom + " – " + item.nb_parrains + " " + __("parrain")
                    else
                        var label = item.nom + " – " + item.nb_parrains + " " + __("parrains")
                    return {label: label, value: item.id}
                })
                .sortBy(function(item){ return item.label })
                .value()

            this.setState({fkAssoApprovedList: res})
        }

        // We don't need to update default state, if we already got a state from sessionStorage
        if (!stateData) {
            fetchAuth(getAPIBaseURL + "countries/", 'get', computeCountries)
            fetchAuth(getAPIBaseURL + "associations/", 'get', computeAllAssociations)
            fetchAuth(getAPIBaseURL + "associations/?approved=yes", 'get', computeApprovedAssociations)
        }
    }

    onFormChange = (event, value) => {
        this.setState({[event]: value}, this.validateFormOnBlur)
    }

    onLoginChange = (event, value) => {
        this.setState({[event]: value.toUpperCase()})
    }

    handleBirthChange = (date) => {
        this.setState({birth: date});
    }

    // zip
    zipOnSearchChange = (search) => {
        this.setState({zipSearch: search})
        // Search for towns for this zipcode for France only
        if (search.length >= 4 && this.state.country.label == "France") {
            // We use fetch API to ... fetch towns for this zipcode
            var computeTowns = (towns) => {
                var zipList = _.chain(towns)
                    .map(function(item){ return {label: item.zip + " - " + item.town, value: item.zip, town: item.town} })
                    .sortBy(function(item){ return item.label })
                    .value()

                var townList = _.chain(towns)
                    .map(function(item){ return {label: item.town, value: item.town} })
                    .sortBy(function(item){ return item.label })
                    .value()

                this.setState({zipList: zipList, townList: townList})
            }
            fetchAuth(getAPIBaseURL + "towns/?zipcode=" + search, 'get', computeTowns)
        }
    }

    zipRenderNoResultsFound = (item, search) => {
        var message = ""

        // We have a search term (not empty)
        if (search)
        {
            // We have a sinificative search term
            if (search.length < 4)
                message = __("Taper 4 chiffres minimum ...")
            else
            {
                // We have a positive result (zip+town list) for this search term
                if (this.state.zipList == undefined)
                    message = __("Pas de résultat")
            }
        }
        else
            message = __("Taper 4 chiffres minimum ...")

        if (message) {
            return  <div className="no-results-found" style={{fontSize: 15}}>
                        {message}
                    </div>
        }
    }

    zipOnValueChange = (item) => {
        if (item) {
            this.setState({zip: item, town: {label: item.town, value: item.town}})
        }
        else
            this.setState({zip: undefined, town: undefined})
    }

    zipRenderValue = (item) => {
        // When we select a value, this is how we display it
        return  <div className="simple-value">
                    <span className="memberaddform" style={{marginLeft: 10, verticalAlign: "middle"}}>{item.value}</span>
                </div>
    }

    zipOnBlur = () => {
        this.setState({zipList: undefined, townList: undefined})
    }

    // town
    townOnValueChange = (item) => {
        this.setState({town: item})
    }

    // country
    countryOnValueChange = (item) => {
        this.setState({country: item})
    }

    // fkasso
    fkAssoOnValueChange = (item) => {
        if (item) {
            if (item.newOption)
                this.setState({assoSaisieLibre: true})
            this.setState({fkAsso: item})
        }
        else {
            this.setState({assoSaisieLibre: false})
            this.setState({fkAsso: undefined})
        }
    }

    // fkasso2
    fkAsso2OnValueChange = (item) => {
        this.setState({fkAsso2: item})
    }

    enableButton = () => {
        this.setState({canSubmit: true, isModalOpen: false});
    }

    disableButton = () => {
        this.setState({canSubmit: false, isModalOpen: false});
    }

    validFields = () => {
        this.setState({validFields: true});

        if (this.state.validCustomFields)
            this.enableButton()
    }

    validateFormOnBlur = () => {
        if (this.state.birth && this.state.zip && this.state.town && this.state.country)
        {
            this.setState({validCustomFields: true})

            if (this.state.validFields)
                this.enableButton()
        }
        else
            this.disableButton()
    }

    openModal = () => {
        this.setState({isModalOpen: true})
    }

    hideModal = () => {
        this.setState({isModalOpen: false})
    }

    getModalElements = () => {
        this.setState({modalBody:
            _.map(this.state.formData,
                (item, key) => {
                    switch (key) {
                        case 'login':
                            return {'label': __('N° adhérent'), 'value': item, order: 1}
                            break;
                        case 'civility_id':
                            return {'label': __('Civilité'),
                                    'value': item == 'MR' ? __('Monsieur') : __('Madame'), order: 2}
                            break;
                        case 'lastname':
                            return {'label': __('Nom'), 'value': item, order: 3}
                            break;
                        case 'firstname':
                            return {'label': __('Prénom'), 'value': item, order: 4}
                            break;
                        case 'birth':
                            return {'label': __('Date de naissance'), 'value': item, order: 5}
                            break;
                        case 'address':
                            return {'label': __('Adresse postale'), 'value': item, order: 6}
                            break;
                        case 'zip':
                            return {'label': __('Code Postal'), 'value': item, order: 7}
                            break;
                        case 'town':
                            return {'label': __('Ville'), 'value': item, order: 8}
                            break;
                        case 'country_id':
                            return {'label': __('Pays'), 'value': this.state.country.label, order: 9}
                            break;
                        case 'phone':
                            return {'label': __('N° téléphone'), 'value': item, order: 10}
                            break;
                        case 'email':
                            return {'label': __('Email'), 'value': item, order: 11}
                            break;
                        case 'options_recevoir_actus':
                            return {'label': __("Souhaite être informé des actualités liées à l'mlc"),
                                    'value': item == '1' ? __('Oui') : __('Non'), order: 12}
                            break
                        case 'options_asso_saisie_libre':
                            return {'label': __('Choix Association 3% #1'), 'value': item, order: 13}
                            break
                        case 'fk_asso':
                            return {'label': __('Choix Association 3% #1'), 'value': this.state.fkAsso.label, order: 13}
                            break;
                        case 'fk_asso2':
                            return {'label': __('Choix Association 3% #2'), 'value': this.state.fkAsso2.label, order: 14}
                            break;
                        default:
                            return {'label': item, 'value': item, order: 999}
                            break;
                    }
                }
            )
        }, this.openModal)
    }

    submitForm = () => {
        var computeForm = (data) => {
            // Clean sessionStorage from data we may have saved
            sessionStorage.removeItem('restart-member-add')

            this.refs.container.success(
                __("La création de l'adhérent s'est déroulée correctement."),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )

            // redirect to create subscription page in 3 seconds
            setTimeout(() => window.location.assign("/members/subscription/add/" + data), 3000)
        }

        var promiseError = (err) => {
            // Error during request, or parsing NOK :(
            
            // Save actual state for later
            sessionStorage.setItem('restart-member-add', JSON.stringify(this.state))
            this.enableButton()

            console.log(this.props.url, err)
            this.refs.container.error(
                __("Une erreur s'est produite lors de la création de l'adhérent !"),
                "",
                {
                    timeOut: 3000,
                    extendedTimeOut: 10000,
                    closeButton:true
                }
            )
        }
        fetchAuth(this.props.url, this.props.method, computeForm, this.state.formData, promiseError)
    }

    buildForm = (data) => {
        this.disableButton()

        // We push custom fields (like DatePickers, Selectize, ...) into the data passed to the server
        data.birth = this.state.birth.format('DD/MM/YYYY')
        data.country_id = this.state.country.value
        data.zip = this.state.zip.value
        data.town = this.state.town.value
        data.login = this.state.login.toUpperCase()

        // We need to verify whether we are in "saisie libre" or not
        if (this.state.fkAsso) {
            if (this.state.assoSaisieLibre)
                data.options_asso_saisie_libre = this.state.fkAsso.value
            else
                data.fk_asso = this.state.fkAsso.value
        }

        if (this.state.fkAsso2)
            data.fk_asso2 = this.state.fkAsso2.value

        this.setState({formData: data}, this.getModalElements)
    }

    render = () => {

        return (
            <div className="row">
                <MemberAddForm
                    onValidSubmit={this.buildForm}
                    onInvalid={this.disableButton}
                    onValid={this.validFields}
                    ref="memberaddform">
                    <fieldset>
                        <Input
                            name="login"
                            data-mlc="memberaddform-login"
                            value={this.state.login}
                            label={__("N° adhérent")}
                            type="text"
                            placeholder={__("N° adhérent")}
                            help={__("Format: E12345")}
                            onChange={this.onLoginChange}
                            validations="isMemberIdMlc"
                            validationErrors={{
                                isMemberIdMlc: __("Ceci n'est pas un N° adhérent Mlc valide.")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                            required
                        />
                        <RadioGroup
                            name="civility_id"
                            value={this.state.civility_id}
                            data-mlc="memberaddform-civility_id"
                            type="inline"
                            label={__("Civilité")}
                            options={[{value: 'MME', label: __('Madame')},
                                     {value: 'MR', label: __('Monsieur')}
                            ]}
                            onChange={this.onFormChange}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                            required
                        />
                        <Input
                            name="lastname"
                            data-mlc="memberaddform-lastname"
                            value={this.state.lastname}
                            onChange={this.onFormChange}
                            label={__("Nom")}
                            type="text"
                            placeholder={__("Nom")}
                            validations="maxLength:45"
                            validationErrors={{
                                maxLength: __("Ce champ ne peut pas faire plus de 45 caractères!")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                            required
                        />
                        <Input
                            name="firstname"
                            data-mlc="memberaddform-firstname"
                            value={this.state.firstname}
                            onChange={this.onFormChange}
                            label={__("Prénom")}
                            type="text"
                            placeholder={__("Prénom")}
                            validations="maxLength:45"
                            validationErrors={{
                                maxLength: __("Ce champ ne peut pas faire plus de 45 caractères!")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                            required
                        />
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-3"
                                data-required="true"
                                htmlFor="memberaddform-birth">
                                {__("Date de naissance")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-6 memberaddform-birth" data-mlc="memberaddform-birth">
                                <DatePicker
                                    name="birth"
                                    className="form-control"
                                    placeholderText={__("Date de naissance")}
                                    selected={this.state.birth}
                                    onChange={this.handleBirthChange}
                                    showYearDropdown
                                    locale="fr"
                                    required
                                />
                            </div>
                        </div>
                        <Textarea
                            name="address"
                            data-mlc="memberaddform-address"
                            value={this.state.address}
                            onChange={this.onFormChange}
                            label={__("Adresse postale")}
                            type="text"
                            placeholder={__("Adresse postale")}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                            rows={3}
                            required
                        />
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-3"
                                data-required="true"
                                htmlFor="memberaddform-zip">
                                {__("Code Postal")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-6 memberaddform" data-mlc="memberaddform-zip">
                                <SimpleSelect
                                    ref="select"
                                    value={this.state.zip}
                                    search={this.state.zipSearch}
                                    options={this.state.zipList}
                                    placeholder={__("Code Postal")}
                                    theme="bootstrap3"
                                    autocomplete="off"
                                    createFromSearch={SelectizeUtils.selectizeCreateFromSearch}
                                    onSearchChange={this.zipOnSearchChange}
                                    onValueChange={this.zipOnValueChange}
                                    renderOption={SelectizeUtils.selectizeRenderOption}
                                    renderValue={this.zipRenderValue}
                                    onBlur={this.zipOnBlur}
                                    renderNoResultsFound={this.zipRenderNoResultsFound}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-3"
                                data-required="true"
                                htmlFor="memberaddform-town">
                                {__("Ville")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-6 memberaddform" data-mlc="memberaddform-town">
                                <SimpleSelect
                                    ref="select"
                                    value={this.state.town}
                                    options={this.state.townList}
                                    placeholder={__("Ville")}
                                    autocomplete="off"
                                    theme="bootstrap3"
                                    createFromSearch={SelectizeUtils.selectizeCreateFromSearch}
                                    onValueChange={this.townOnValueChange}
                                    renderValue={SelectizeUtils.selectizeRenderValue}
                                    onBlur={this.validateFormOnBlur}
                                    renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-3"
                                data-required="true"
                                htmlFor="memberaddform-country">
                                {__("Pays")}
                                <span className="required-symbol">&nbsp;*</span>
                            </label>
                            <div className="col-sm-6 memberaddform" data-mlc="memberaddform-country">
                                <SimpleSelect
                                    ref="select"
                                    value={this.state.country}
                                    options={this.state.countries}
                                    placeholder={__("Pays")}
                                    autocomplete="off"
                                    theme="bootstrap3"
                                    onValueChange={this.countryOnValueChange}
                                    renderOption={SelectizeUtils.selectizeNewRenderOption}
                                    renderValue={SelectizeUtils.selectizeRenderValue}
                                    onBlur={this.validateFormOnBlur}
                                    renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                    required
                                />
                            </div>
                        </div>
                        <Input
                            name="phone"
                            data-mlc="memberaddform-phone"
                            value={this.state.phone}
                            label={__("N° téléphone")}
                            type="tel"
                            placeholder={__("N° téléphone")}
                            validations={this.state.email ? false : "isValidPhoneNumber"}
                            validationErrors={{
                                isValidPhoneNumber: __("Ceci n'est pas un N° téléphone valide. Evitez les points et les espaces.")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                            onChange={this.onFormChange}
                            required={!this.state.email}
                        />
                        <Input
                            name="email"
                            data-mlc="memberaddform-email"
                            value={this.state.email}
                            label={__("Email")}
                            type="email"
                            placeholder={__("Email de l'adhérent")}
                            validations={this.state.phone ? false : "isEmail"}
                            validationErrors={{
                                isEmail: __("Adresse email non valide")
                            }}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                            onChange={this.onFormChange}
                            required={!this.state.phone}
                        />
                        <RadioGroup
                            name="options_recevoir_actus"
                            data-mlc="memberaddform-options-recevoir-actus"
                            value={this.state.options_recevoir_actus}
                            onChange={this.onFormChange}
                            type="inline"
                            label={__("Souhaite être informé des actualités liées à l'mlc")}
                            help={__("L'adhérent recevra un à deux mails par semaine.")}
                            options={[{value: '1', label: __('Oui')},
                                      {value: '0', label: __('Non')}
                            ]}
                            elementWrapperClassName={[{'col-sm-9': false}, 'col-sm-6']}
                            required
                        />
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-3"
                                data-required="true"
                                htmlFor="memberaddform-asso">
                                {__("Choix Association 3% #1")}
                            </label>
                            <div className="col-sm-6 memberaddform" data-mlc="memberaddform-asso">
                                <SimpleSelect
                                    ref="select"
                                    value={this.state.fkAsso}
                                    options={this.state.fkAssoAllList}
                                    placeholder={__("Choix Association 3% #1")}
                                    theme="bootstrap3"
                                    createFromSearch={SelectizeUtils.selectizeCreateFromSearch}
                                    onValueChange={this.fkAssoOnValueChange}
                                    renderValue={SelectizeUtils.selectizeRenderValue}
                                    renderOption={SelectizeUtils.selectizeNewRenderOption}
                                    onBlur={this.validateFormOnBlur}
                                    renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                />
                            </div>
                        </div>
                        <div className="form-group row">
                            <label
                                className="control-label col-sm-3"
                                data-required="true"
                                htmlFor="memberaddform-asso2">
                                {__("Choix Association 3% #2")}
                            </label>
                            <div className="col-sm-6 memberaddform" data-mlc="memberaddform-asso2">
                                <SimpleSelect
                                    ref="select"
                                    value={this.state.fkAsso2}
                                    options={this.state.fkAssoApprovedList}
                                    placeholder={__("Choix Association 3% #2")}
                                    theme="bootstrap3"
                                    onValueChange={this.fkAsso2OnValueChange}
                                    renderOption={SelectizeUtils.selectizeRenderOption}
                                    renderValue={SelectizeUtils.selectizeRenderValue}
                                    onBlur={this.validateFormOnBlur}
                                    renderNoResultsFound={SelectizeUtils.selectizeNoResultsFound}
                                />
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <Row layout="horizontal">
                            <input
                                name="submit"
                                data-mlc="memberaddform-submit"
                                type="submit"
                                defaultValue={__("Création d'un adhérent")}
                                className="btn btn-success"
                                formNoValidate={true}
                                disabled={!this.state.canSubmit}
                            />
                        </Row>
                    </fieldset>
                </MemberAddForm>
                <ToastContainer ref="container"
                                toastMessageFactory={ToastMessageFactory}
                                className="toast-top-right toast-top-right-navbar" />
                <ModalMlc hideModal={this.hideModal} isModalOpen={this.state.isModalOpen} modalBody={this.state.modalBody} onValidate={this.submitForm} />
            </div>
        );
    }
}


ReactDOM.render(
    <MemberAddPage url={getAPIBaseURL + "members/"} method="POST" />,
    document.getElementById('member-add')
)

ReactDOM.render(
    <NavbarTitle title={__("Adhésion")} />,
    document.getElementById('navbar-title')
)