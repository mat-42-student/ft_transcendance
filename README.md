#ft_transcendance
##Table des matières

    ##Description
    ##Modules
        ###Backend Django
        ###Base de données PostgreSQL
        ###Gestion des utilisateurs
        ###Authentification 42 et 2FA
        ###Chat en temps réel
        ###ELK (ElasticSearch, Logstash, Kibana)
        ###Monitoring
        ###Jeu en ligne côté serveur

##Description
ft_transcendance est un projet web complet basé sur une architecture moderne. Il combine plusieurs technologies pour offrir une application robuste, sécurisée et évolutive. Le projet inclut un backend puissant, une gestion avancée des utilisateurs, des fonctionnalités de chat en temps réel, et un jeu multi-joueurs en ligne, le tout supervisé par un système de monitoring et de logging complet.
Modules

##Backend Django
Le backend de l'application est construit avec Django, un framework web en Python qui facilite le développement rapide et le déploiement d'applications web robustes. Django est utilisé pour sa capacité à gérer des applications complexes et son écosystème riche.

##Base de données PostgreSQL
Le stockage des données est géré par PostgreSQL, une base de données relationnelle puissante et open-source. Elle est choisie pour sa conformité aux standards SQL, sa fiabilité, et ses fonctionnalités avancées comme le support des transactions complexes et les extensions.

##Gestion des utilisateurs
La gestion des utilisateurs inclut l'inscription, la connexion, la récupération de mot de passe, et plus encore. Les utilisateurs sont stockés dans la base de données avec une gestion fine des rôles et des permissions.

##Authentification 42 et 2FA
Le système d'authentification est renforcé par l'intégration avec l'authentification 42 (intranet 42) et l'authentification à deux facteurs (2FA). Cela garantit un accès sécurisé à l'application, en s'assurant que les utilisateurs sont bien ceux qu'ils prétendent être.

##Chat en temps réel
Le module de chat en temps réel permet aux utilisateurs de communiquer instantanément au sein de l'application. Ce chat supporte les conversations en groupe, les messages privés, ainsi que les notifications en temps réel.

##ELK (ElasticSearch, Logstash, Kibana)
Pour le suivi et l'analyse des logs, l'application utilise la stack ELK (ElasticSearch, Logstash, Kibana). ElasticSearch est utilisé pour l'indexation et la recherche de données, Logstash pour la collecte et la transformation des logs, et Kibana pour la visualisation des données.

##Monitoring
Le monitoring de l'application est essentiel pour assurer sa disponibilité et ses performances. Des outils de surveillance sont intégrés pour superviser les métriques du système, détecter les anomalies, et alerter en cas de problèmes.

##Jeu en ligne côté serveur
Le cœur du projet est un jeu en ligne qui fonctionne côté serveur. Les joueurs peuvent se connecter depuis des postes distants et interagir en temps réel. Le jeu est conçu pour être rapide, réactif et capable de gérer un grand nombre de connexions simultanées.
