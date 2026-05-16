const h = React.createElement

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

const api = async (url, options = {}) => {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
        const error = new Error('Request failed')
        error.data = data
        throw error
    }

    return data
}

const navigate = path => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
}

const daysInMonth = (month, year) => new Date(Number(year), Number(month), 0).getDate()
const isWeekend = (day, month, year) => [0, 6].includes(new Date(Number(year), Number(month) - 1, day).getDay())
const storageKey = (prefix, month, year) => `${prefix}-${month}-${year}`
const personStorageKey = (personId, month, year) => `person-${personId}-${month}-${year}`
const readJsonStorage = (key, fallback) => {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback
    } catch (err) {
        return fallback
    }
}

function Header({ user, leadingAction }) {
    const name = user ? [user.userName, user.displayName].filter(Boolean).join(' ') : ''

    return h('header', null,
        h('nav', null,
            leadingAction && h('ul', { className: 'nav_links' },
                h('li', null, leadingAction)
            )
        ),
        h('h2', { className: 'Welcome' }, `Welcome ${name}`),
        h('nav', null,
            h('ul', { className: 'nav_links' },
                h('li', null, h('a', { href: '/logout', className: 'logout' }, 'Logout'))
            )
        )
    )
}

function Landing() {
    return h('main', { className: 'container login-container' },
        h('section', { className: 'card authCard' },
            h('h1', null, 'Create Your Own Shift Plan!'),
            h('div', { className: 'authActions' },
                h('button', { className: 'btn-large', onClick: () => navigate('/login') }, 'Login'),
                h('button', { className: 'btn-large', onClick: () => navigate('/signup') }, 'Sign Up')
            ),
            h('p', { className: 'or' }, '-OR-'),
            h('a', { href: '/auth/google', className: 'btn-large googleButton' },
                h('i', { className: 'fab fa-google' }),
                ' Log in with Google'
            )
        )
    )
}

function AuthForm({ mode }) {
    const isSignup = mode === 'signup'
    const [form, setForm] = React.useState({
        userName: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [errors, setErrors] = React.useState([])

    const submit = async event => {
        event.preventDefault()
        setErrors([])

        try {
            const data = await api(isSignup ? '/signup' : '/login', {
                method: 'POST',
                body: JSON.stringify(form)
            })
            window.location.href = data.redirect || '/plan'
        } catch (err) {
            setErrors(err.data?.errors || [{ msg: 'Something went wrong.' }])
        }
    }

    const setField = field => event => setForm({ ...form, [field]: event.target.value })

    return h('main', { className: 'container login-container' },
        h('section', { className: 'card authCard' },
            h('div', { className: 'center-align' },
                h('h1', null, isSignup ? 'Sign Up' : 'Log in'),
                Boolean(errors.length) && h('div', { className: 'daysError' },
                    errors.map((error, index) => h('div', { key: index }, error.msg || 'Unable to continue.'))
                )
            ),
            h('form', { className: 'authForm', onSubmit: submit },
                isSignup && h('input', {
                    placeholder: 'User Name',
                    value: form.userName,
                    onChange: setField('userName')
                }),
                h('input', {
                    placeholder: 'Email',
                    type: 'email',
                    value: form.email,
                    onChange: setField('email')
                }),
                h('input', {
                    placeholder: 'Password',
                    type: 'password',
                    value: form.password,
                    onChange: setField('password')
                }),
                isSignup && h('span', { className: 'helper-text' }, '(Password must be at least 8 characters long)'),
                isSignup && h('input', {
                    placeholder: 'Confirm Password',
                    type: 'password',
                    value: form.confirmPassword,
                    onChange: setField('confirmPassword')
                }),
                h('input', { className: 'btn-large', type: 'submit', value: isSignup ? 'Sign Up' : 'Log in' })
            )
        )
    )
}

function PlanPage() {
    const [data, setData] = React.useState(null)
    const [errors, setErrors] = React.useState([])
    const [month, setMonth] = React.useState(new Date().getMonth() + 1)
    const [year, setYear] = React.useState(new Date().getFullYear())
    const [includeOffDays, setIncludeOffDays] = React.useState(false)
    const [allowConsecutiveShifts, setAllowConsecutiveShifts] = React.useState(false)
    const [customOffDays, setCustomOffDays] = React.useState([])
    const [unavailable, setUnavailable] = React.useState({})
    const [newPerson, setNewPerson] = React.useState({ personName: '', daysOfWork: '', daysOfOffDays: '' })
    const [newOffDay, setNewOffDay] = React.useState('')
    const [removeOffDay, setRemoveOffDay] = React.useState('')

    const loadPlan = React.useCallback(async () => {
        try {
            const planData = await api('/api/plan')
            setData(planData)
            setMonth(planData.selectedMonth)
            setYear(planData.selectedYear)
        } catch (err) {
            if (err.data?.error) {
                navigate('/')
            }
        }
    }, [])

    React.useEffect(() => {
        loadPlan()
    }, [loadPlan])

    React.useEffect(() => {
        setIncludeOffDays(localStorage.getItem(storageKey('include-off-days', month, year)) === 'true')
        setAllowConsecutiveShifts(localStorage.getItem(storageKey('allow-consecutive-shifts', month, year)) === 'true')
        setCustomOffDays(readJsonStorage(storageKey('custom-off-days', month, year), []))
    }, [month, year])

    React.useEffect(() => {
        if (!data) return

        const nextUnavailable = {}
        data.plan.forEach(person => {
            const saved = readJsonStorage(personStorageKey(person._id, month, year), [])
            nextUnavailable[person._id] = Array.from({ length: daysInMonth(month, year) }, (_, index) => Boolean(saved[index]))
        })
        setUnavailable(nextUnavailable)
    }, [data, month, year])

    const currentDays = daysInMonth(month, year)
    const isOffDay = day => isWeekend(day, month, year) || customOffDays.includes(day)
    const offDaysCount = Array.from({ length: currentDays }, (_, index) => index + 1).filter(isOffDay).length
    const planDaysCount = includeOffDays ? currentDays : currentDays - offDaysCount
    const totalDaysOfWork = data?.plan.reduce((total, person) => total + Number(person.daysOfWork || 0), 0) || 0
    const totalDaysOfOffDays = data?.plan.reduce((total, person) => total + Number(person.daysOfOffDays || 0), 0) || 0
    const statusMessages = [
        totalDaysOfWork !== planDaysCount
            ? `Total days of work must equal ${planDaysCount}. Current total: ${totalDaysOfWork}.`
            : null,
        includeOffDays && totalDaysOfOffDays !== offDaysCount
            ? `Total off days must equal ${offDaysCount}. Current total: ${totalDaysOfOffDays}.`
            : null
    ].filter(Boolean)

    const updateIncludeOffDays = checked => {
        localStorage.setItem(storageKey('include-off-days', month, year), checked)
        setIncludeOffDays(checked)
    }

    const updateAllowConsecutive = checked => {
        localStorage.setItem(storageKey('allow-consecutive-shifts', month, year), checked)
        setAllowConsecutiveShifts(checked)
    }

    const saveCustomOffDays = days => {
        localStorage.setItem(storageKey('custom-off-days', month, year), JSON.stringify(days))
        setCustomOffDays(days)
    }

    const addCustomOffDay = () => {
        const day = Number(newOffDay)
        if (!Number.isInteger(day) || day < 1 || day > currentDays) return
        saveCustomOffDays([...new Set([...customOffDays, day])].sort((a, b) => a - b))
        setNewOffDay('')
    }

    const deleteCustomOffDay = () => {
        const day = Number(removeOffDay)
        if (!Number.isInteger(day) || day < 1 || day > currentDays) return
        saveCustomOffDays(customOffDays.filter(offDay => offDay !== day))
        setRemoveOffDay('')
    }

    const addPerson = async event => {
        event.preventDefault()
        setErrors([])

        try {
            await api('/api/plan/addPerson', {
                method: 'POST',
                body: JSON.stringify(newPerson)
            })
            setNewPerson({ personName: '', daysOfWork: '', daysOfOffDays: '' })
            loadPlan()
        } catch (err) {
            setErrors(err.data?.errors || [{ msg: 'Could not add this person.' }])
        }
    }

    const deletePerson = async personId => {
        await api('/api/plan/deletePerson', {
            method: 'DELETE',
            body: JSON.stringify({ personIdFromJSFile: personId })
        })
        loadPlan()
    }

    const toggleUnavailable = (personId, day) => {
        const existing = unavailable[personId] || Array(currentDays).fill(false)
        const updated = [...existing]
        updated[day - 1] = !updated[day - 1]
        localStorage.setItem(personStorageKey(personId, month, year), JSON.stringify(updated))
        setUnavailable({ ...unavailable, [personId]: updated })
    }

    const createPlan = async event => {
        event.preventDefault()
        setErrors([])

        const unavailableDays = {}
        Object.entries(unavailable).forEach(([personId, days]) => {
            unavailableDays[personId] = days
                .map((checked, index) => checked ? String(index + 1) : null)
                .filter(Boolean)
        })

        try {
            const created = await api('/api/plan/createdPlan', {
                method: 'POST',
                body: JSON.stringify({
                    month,
                    year,
                    offDays: includeOffDays ? 'on' : '',
                    allowConsecutiveShifts: allowConsecutiveShifts ? 'on' : '',
                    customOffDays,
                    unavailableDays
                })
            })
            sessionStorage.setItem('created-plan', JSON.stringify(created))
            navigate('/created-plan')
        } catch (err) {
            setErrors(err.data?.errors || [{ msg: 'Could not create the plan.' }])
        }
    }

    if (!data) {
        return h('p', { className: 'loadingState' }, 'Loading...')
    }

    return h(React.Fragment, null,
        h(Header, { user: data.user }),
        h('main', { className: 'pageShell' },
            h('form', { className: 'personForm panel', onSubmit: addPerson },
                h('div', { className: 'monthPicker' },
                    h('label', { htmlFor: 'month' }, 'Month'),
                    h('select', { id: 'month', value: month, onChange: event => setMonth(Number(event.target.value)) },
                        monthNames.map((name, index) => h('option', { key: name, value: index + 1 }, name))
                    ),
                    h('label', { htmlFor: 'year' }, 'Year'),
                    h('input', { id: 'year', type: 'number', min: '1900', max: '3000', value: year, onChange: event => setYear(Number(event.target.value)) }),
                    h('label', { className: 'checkboxLabel' },
                        h('input', { type: 'checkbox', checked: includeOffDays, onChange: event => updateIncludeOffDays(event.target.checked) }),
                        ' Include Off Days'
                    ),
                    h('label', { className: 'checkboxLabel' },
                        h('input', { type: 'checkbox', checked: allowConsecutiveShifts, onChange: event => updateAllowConsecutive(event.target.checked) }),
                        ' Allow Consecutive Shifts'
                    ),
                    h('div', { className: 'customOffDaysControls' },
                        h('input', { type: 'number', placeholder: 'Add an off day', min: '1', max: '31', value: newOffDay, onChange: event => setNewOffDay(event.target.value) }),
                        h('button', { type: 'button', onClick: addCustomOffDay }, 'Add'),
                        h('input', { type: 'number', placeholder: 'Remove an off day', min: '1', max: '31', value: removeOffDay, onChange: event => setRemoveOffDay(event.target.value) }),
                        h('button', { type: 'button', onClick: deleteCustomOffDay }, 'Remove'),
                        h('p', { id: 'customOffDaysList' }, customOffDays.length ? `Extra off days: ${customOffDays.join(', ')}` : '')
                    )
                ),
                h('h2', null, "Please enter Person's information"),
                h('input', { type: 'text', placeholder: 'Name', value: newPerson.personName, onChange: event => setNewPerson({ ...newPerson, personName: event.target.value }) }),
                h('input', { type: 'number', placeholder: 'Number of work days', value: newPerson.daysOfWork, onChange: event => setNewPerson({ ...newPerson, daysOfWork: event.target.value }) }),
                includeOffDays && h('input', { type: 'number', placeholder: 'Number of off days', value: newPerson.daysOfOffDays, onChange: event => setNewPerson({ ...newPerson, daysOfOffDays: event.target.value }) }),
                h('button', { type: 'submit' }, 'Add Person')
            ),
            Boolean(errors.length) && h('div', { className: 'daysError' },
                errors.map((error, index) => h('div', { key: index }, error.msg || 'Unable to continue.'))
            ),
            data.plan.length
                ? h('form', { onSubmit: createPlan },
                    h('div', { className: 'tableScroll' },
                        h('table', { className: 'plannerTable', style: { '--days': currentDays } },
                            h('colgroup', null,
                                h('col', { className: 'personNameColumn' }),
                                Array.from({ length: currentDays }, (_, index) => h('col', { key: index, className: 'dayColumn' }))
                            ),
                            h('thead', null,
                                h('tr', null,
                                    h('th', null, 'Name'),
                                    Array.from({ length: currentDays }, (_, index) => {
                                        const day = index + 1
                                        return h('td', { key: day, className: isOffDay(day) ? 'weekendDay' : '' }, day)
                                    })
                                )
                            ),
                            h('tbody', null,
                                data.plan.map(person => h('tr', { key: person._id, className: 'personPlan' },
                                    h('td', { className: 'myTd' },
                                        h('button', { type: 'button', className: 'del material-symbols-outlined', onClick: () => deletePerson(person._id), title: 'Delete person' }, 'delete'),
                                        `(${Number(person.daysOfWork || 0) - Number(person.daysOfOffDays || 0)} + ${Number(person.daysOfOffDays || 0)}) ${person.personName}`
                                    ),
                                    Array.from({ length: currentDays }, (_, index) => {
                                        const day = index + 1
                                        const offDay = isOffDay(day)
                                        const checked = Boolean(unavailable[person._id]?.[day - 1])
                                        return h('td', { key: day, className: [offDay ? 'weekendDay' : '', checked ? 'checkedUnavailableDay' : ''].join(' ') },
                                            (includeOffDays || !offDay) && h('input', {
                                                type: 'checkbox',
                                                className: 'persist-checkbox',
                                                checked,
                                                onChange: () => toggleUnavailable(person._id, day)
                                            })
                                        )
                                    })
                                ))
                            )
                        )
                    ),
                    h('div', null,
                        h('button', { id: 'createMyPlan', type: 'submit', className: 'btn-large', disabled: Boolean(statusMessages.length) }, 'Create my plan'),
                        h('p', { id: 'createPlanStatus', className: 'daysError' }, statusMessages.join(' '))
                    )
                )
                : h('p', { id: 'noPeople' }, 'No people added yet')
        )
    )
}

function CreatedPlanPage() {
    let saved = null
    try {
        saved = JSON.parse(sessionStorage.getItem('created-plan'))
    } catch (err) {
        saved = null
    }
    const [index, setIndex] = React.useState(0)

    if (!saved) {
        return h('main', { className: 'pageShell' },
            h('p', null, 'No plan has been created yet.'),
            h('button', { className: 'btn-large', onClick: () => navigate('/plan') }, 'Back to planner')
        )
    }

    const plans = saved.createdPlans || [saved.createdPlan || []]
    const plan = plans[index] || []
    const isOffDay = day => isWeekend(day, saved.selectedMonth, saved.selectedYear) || (saved.customOffDays || []).includes(day)

    return h(React.Fragment, null,
        h(Header, {
            user: saved.user,
            leadingAction: h('button', { type: 'button', className: 'headerNavButton', onClick: () => navigate('/plan') }, 'Back to planner')
        }),
        h('main', { className: 'pageShell' },
            h('section', { className: 'panel createdPlanPanel' },
                h('div', { className: 'sectionHeader' }, h('h2', null, `${saved.monthName} ${saved.selectedYear}`)),
                h('div', { className: 'createdPlanLayout' },
                    h('table', { className: 'createdPlanTable' },
                        h('thead', null, h('tr', null, h('th', null, 'Day'), h('th', null, 'Person'))),
                        h('tbody', null,
                            plan.map(planDay => h('tr', { key: planDay.day, className: isOffDay(planDay.day) ? 'weekendDay' : '' },
                                h('td', null, planDay.day),
                                h('td', null, planDay.personName)
                            ))
                        )
                    ),
                    h('div', { className: 'planNavigation' },
                        plans.length > 1 && h('button', { type: 'button', className: 'btn-large', disabled: index === 0, onClick: () => setIndex(index - 1) }, 'Show previous plan'),
                        h('p', null, `Plan ${index + 1} of ${plans.length}`),
                        plans.length > 1 && h('button', { type: 'button', className: 'btn-large', disabled: index >= plans.length - 1, onClick: () => setIndex(index + 1) }, 'Show next plan')
                    )
                )
            )
        )
    )
}

function App() {
    const [path, setPath] = React.useState(window.location.pathname)

    React.useEffect(() => {
        const onPopState = () => setPath(window.location.pathname)
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [])

    if (path === '/login') return h(AuthForm, { mode: 'login' })
    if (path === '/signup') return h(AuthForm, { mode: 'signup' })
    if (path === '/plan') return h(PlanPage)
    if (path === '/created-plan') return h(CreatedPlanPage)
    return h(Landing)
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App))
