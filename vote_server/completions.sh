_diesel() {
    local i cur prev opts cmds
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    cmd=""
    opts=""

    for i in ${COMP_WORDS[@]}
    do
        case "${i}" in
            "$1")
                cmd="diesel"
                ;;
            completions)
                cmd+="__completions"
                ;;
            database)
                cmd+="__database"
                ;;
            drop)
                cmd+="__drop"
                ;;
            generate)
                cmd+="__generate"
                ;;
            help)
                cmd+="__help"
                ;;
            list)
                cmd+="__list"
                ;;
            migration)
                cmd+="__migration"
                ;;
            pending)
                cmd+="__pending"
                ;;
            print-schema)
                cmd+="__print__schema"
                ;;
            redo)
                cmd+="__redo"
                ;;
            reset)
                cmd+="__reset"
                ;;
            revert)
                cmd+="__revert"
                ;;
            run)
                cmd+="__run"
                ;;
            setup)
                cmd+="__setup"
                ;;
            *)
                ;;
        esac
    done

    case "${cmd}" in
        diesel)
            opts="-h -V --help --version --database-url --config-file --locked-schema migration setup database completions print-schema help"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 1 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__completions)
            opts="-h --help --database-url --config-file --locked-schema bash elvish fish powershell zsh"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 2 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__database)
            opts="-h --migration-dir --help --database-url --config-file --locked-schema setup reset drop help"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 2 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__database__drop)
            opts="-h --migration-dir --help --database-url --config-file --locked-schema"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__database__help)
            opts="--migration-dir --database-url --config-file --locked-schema <SUBCOMMAND>..."
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__database__reset)
            opts="-h --migration-dir --help --database-url --config-file --locked-schema"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__database__setup)
            opts="-h --migration-dir --help --database-url --config-file --locked-schema"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__help)
            opts="--database-url --config-file --locked-schema <SUBCOMMAND>..."
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 2 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__migration)
            opts="-h --migration-dir --help --database-url --config-file --locked-schema run revert redo list pending generate help"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 2 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__migration__generate)
            opts="-u -h --version --no-down --format --migration-dir --help --database-url --config-file --locked-schema <MIGRATION_NAME>"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --version)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --format)
                    COMPREPLY=($(compgen -W "sql" -- "${cur}"))
                    return 0
                    ;;
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__migration__help)
            opts="--migration-dir --database-url --config-file --locked-schema <SUBCOMMAND>..."
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__migration__list)
            opts="-h --migration-dir --help --database-url --config-file --locked-schema"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__migration__pending)
            opts="-h --migration-dir --help --database-url --config-file --locked-schema"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__migration__redo)
            opts="-a -n -h --all --number --migration-dir --help --database-url --config-file --locked-schema"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --number)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                -n)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__migration__revert)
            opts="-a -n -h --all --number --migration-dir --help --database-url --config-file --locked-schema"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --number)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                -n)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__migration__run)
            opts="-h --migration-dir --help --database-url --config-file --locked-schema"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 3 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__print__schema)
            opts="-s -o -e -h --schema --only-tables --except-tables --with-docs --column-sorting --patch-file --import-types --no-generate-missing-sql-type-definitions --help --database-url --config-file --locked-schema <table-name>..."
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 2 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --schema)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                -s)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --column-sorting)
                    COMPREPLY=($(compgen -W "ordinal_position name" -- "${cur}"))
                    return 0
                    ;;
                --patch-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --import-types)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
        diesel__setup)
            opts="-h --migration-dir --help --database-url --config-file --locked-schema"
            if [[ ${cur} == -* || ${COMP_CWORD} -eq 2 ]] ; then
                COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
                return 0
            fi
            case "${prev}" in
                --migration-dir)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --database-url)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                --config-file)
                    COMPREPLY=($(compgen -f "${cur}"))
                    return 0
                    ;;
                *)
                    COMPREPLY=()
                    ;;
            esac
            COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
            return 0
            ;;
    esac
}

complete -F _diesel -o bashdefault -o default diesel
