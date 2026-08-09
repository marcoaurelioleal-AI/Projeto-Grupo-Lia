GROUP_BRAND_NAME = "Grupo Lia"
OPERATIONAL_STORE_NAMES = ("Lia Burger", "Lia Pizzas", "Lia Salgados")
FACTORY_UNIT_NAME = "Fábrica Lia"
OPERATIONAL_UNIT_NAMES = (*OPERATIONAL_STORE_NAMES, FACTORY_UNIT_NAME)
DEFAULT_OPERATIONAL_STORE = OPERATIONAL_STORE_NAMES[0]


def is_group_brand(name: str | None) -> bool:
    return bool(name and name.strip().casefold() == GROUP_BRAND_NAME.casefold())
