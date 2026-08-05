package collections

// Section represents a group of related fields in a collection schema
type Section struct {
	ID           int    `json:"id" gorm:"primaryKey;autoIncrement"`
	CollectionID int    `json:"collection_id"`
	Name         string `json:"name"`
	Order        int    `json:"order"`
}
